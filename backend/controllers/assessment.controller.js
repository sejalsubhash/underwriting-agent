const crypto = require('crypto');
const s3Service = require('../services/s3.service');
const assessmentQueue = require('../services/queue.service');
const calculationEngine = require('../services/calculation-engine');
const auditService = require('../services/audit.service');
const { validateCallbackUrl } = require('../services/webhook.service');

const editableFinancialFields = ['revenue', 'profit', 'liabilities'];
const allowedDecisions = ['Approve', 'Refer', 'Decline'];

function validateUpdatedFields(updatedFields = {}) {
  const sanitized = {};

  for (const field of editableFinancialFields) {
    if (Object.prototype.hasOwnProperty.call(updatedFields, field)) {
      const value = Number(updatedFields[field]);

      if (!Number.isFinite(value) || value < 0) {
        const err = new Error(`${field} must be a non-negative number`);
        err.statusCode = 400;
        throw err;
      }

      sanitized[field] = value;
    }
  }

  return sanitized;
}

async function recalculateWithUpdatedFields(assessmentId, updatedFields) {
  const assessment = await s3Service.readFullAssessment(assessmentId);

  if (!assessment.metadata) {
    const err = new Error('Assessment not found');
    err.statusCode = 404;
    throw err;
  }

  if (!assessment.extracted || !assessment.results) {
    const err = new Error('Assessment has not completed extraction and scoring yet');
    err.statusCode = 409;
    throw err;
  }

  const nextExtracted = {
    ...assessment.extracted,
    financials: {
      ...assessment.extracted.financials,
      ...updatedFields
    }
  };

  const nextResults = {
    ...calculationEngine.calculateAssessmentScore({
      extracted: nextExtracted,
      apiResponses: assessment.apiResponses
    }),
    previousDecision: assessment.results.decision,
    recalculatedAt: new Date().toISOString()
  };

  await s3Service.writeAssessmentJson(assessmentId, 'extracted.json', nextExtracted);
  await s3Service.writeAssessmentJson(assessmentId, 'results.json', nextResults);

  return {
    previousAssessment: assessment,
    metadata: assessment.metadata,
    extracted: nextExtracted,
    results: nextResults,
    apiResponses: assessment.apiResponses
  };
}

async function createAssessment(req, res, next) {
  try {
    const { companyName, loanAmount, pan, caseId, callbackUrl } = req.body;
    const files = req.files || [];

    if (!companyName || !loanAmount || !pan || !caseId) {
      return res.status(400).json({
        error: 'companyName, loanAmount, pan and caseId are required'
      });
    }

    if (!files.length) {
      return res.status(400).json({ error: 'At least one PDF file is required' });
    }

    const assessmentId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const normalizedCallbackUrl = validateCallbackUrl(callbackUrl);

    const documents = await s3Service.saveAssessmentDocuments(assessmentId, files);

    const metadata = {
      id: assessmentId,
      caseId,
      companyName,
      loanAmount: Number(loanAmount),
      pan,
      status: 'pending',
      createdAt,
      documents,
      callbackUrl: normalizedCallbackUrl
    };

    await s3Service.writeAssessmentJson(assessmentId, 'metadata.json', metadata);
    const job = await assessmentQueue.addAssessmentJob({
      assessmentId,
      caseId,
      createdAt
    });

    await auditService.logAssessmentCreated({
      assessmentId,
      user: 'api-ingestion',
      metadata
    });
    await auditService.logAssessmentQueued({
      assessmentId,
      user: 'api-ingestion',
      jobId: job.id
    });

    console.log('[assessment:create]', {
      assessmentId,
      caseId,
      documents: documents.length,
      jobId: job.id
    });

    res.status(201).json({ assessmentId });
  } catch (err) {
    next(err);
  }
}

async function getAssessment(req, res, next) {
  try {
    const assessment = await s3Service.readFullAssessment(req.params.id);

    if (!assessment.metadata) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    res.json(assessment);
  } catch (err) {
    next(err);
  }
}

async function recalculateAssessment(req, res, next) {
  try {
    const updatedFields = validateUpdatedFields(req.body.updatedFields);
    const assessment = await recalculateWithUpdatedFields(req.params.id, updatedFields);

    await auditService.logRecalculation({
      assessmentId: req.params.id,
      user: req.body.user || 'credit.manager@local',
      oldAssessment: assessment.previousAssessment,
      updatedFields,
      newResults: assessment.results
    });

    console.log('[assessment:recalculate]', {
      assessmentId: req.params.id,
      updatedFields,
      score: assessment.results.score,
      decision: assessment.results.decision
    });

    res.json({
      metadata: assessment.metadata,
      extracted: assessment.extracted,
      results: assessment.results,
      apiResponses: assessment.apiResponses
    });
  } catch (err) {
    next(err);
  }
}

async function reviewAssessment(req, res, next) {
  try {
    const assessmentId = req.params.id;
    const { decision, notes, user } = req.body;

    if (!allowedDecisions.includes(decision)) {
      return res.status(400).json({
        error: `decision must be one of: ${allowedDecisions.join(', ')}`
      });
    }

    const existingAssessment = await s3Service.readFullAssessment(assessmentId);
    if (!existingAssessment.metadata) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const updatedFields = validateUpdatedFields(req.body.updatedFields);
    const recalculatedAssessment = await recalculateWithUpdatedFields(assessmentId, updatedFields);
    const reviewedAt = new Date().toISOString();

    const finalResults = {
      ...recalculatedAssessment.results,
      decision,
      systemDecision: recalculatedAssessment.results.decision,
      humanReview: {
        decision,
        notes: notes || '',
        user: user || 'unknown',
        reviewedAt
      },
      finalizedAt: reviewedAt
    };

    await s3Service.writeAssessmentJson(assessmentId, 'results.json', finalResults);
    await s3Service.updateAssessmentMetadata(assessmentId, {
      status: 'reviewed',
      reviewedAt,
      reviewedBy: user || 'unknown'
    });

    await auditService.logRecalculation({
      assessmentId,
      user,
      oldAssessment: existingAssessment,
      updatedFields,
      newResults: recalculatedAssessment.results
    });
    await auditService.logFinalReview({
      assessmentId,
      user,
      oldAssessment: existingAssessment,
      finalResults,
      notes
    });

    console.log('[assessment:review]', {
      assessmentId,
      user,
      decision
    });

    res.json({
      metadata: {
        ...recalculatedAssessment.metadata,
        status: 'reviewed',
        reviewedAt,
        reviewedBy: user || 'unknown'
      },
      extracted: recalculatedAssessment.extracted,
      results: finalResults,
      apiResponses: recalculatedAssessment.apiResponses
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createAssessment,
  getAssessment,
  recalculateAssessment,
  reviewAssessment
};
