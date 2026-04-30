const s3Service = require('./s3.service');

function normalizeUser(user) {
  return user || 'unknown';
}

function createAuditEntry({ user, action, oldValue = null, newValue = null, timestamp }) {
  if (!action) {
    const err = new Error('Audit action is required');
    err.statusCode = 500;
    throw err;
  }

  return {
    user: normalizeUser(user),
    action,
    oldValue,
    newValue,
    timestamp: timestamp || new Date().toISOString()
  };
}

async function appendAuditEntries(entries) {
  const normalizedEntries = (Array.isArray(entries) ? entries : [entries]).map(createAuditEntry);
  const filePath = await s3Service.appendSiemLogEntries(normalizedEntries);

  console.log('[audit:append]', {
    filePath,
    entries: normalizedEntries.length
  });

  return {
    filePath,
    entries: normalizedEntries
  };
}

async function logAssessmentCreated({ assessmentId, user, metadata }) {
  return appendAuditEntries({
    user,
    action: `assessment:${assessmentId}:created`,
    oldValue: null,
    newValue: {
      caseId: metadata.caseId,
      companyName: metadata.companyName,
      loanAmount: metadata.loanAmount,
      status: metadata.status,
      documents: metadata.documents.length
    }
  });
}

async function logAssessmentQueued({ assessmentId, user, jobId }) {
  return appendAuditEntries({
    user,
    action: `assessment:${assessmentId}:queued`,
    oldValue: 'pending',
    newValue: {
      queueJobId: jobId
    }
  });
}

async function logWebhookDelivery({ assessmentId, user, callbackUrl, payload, status, responseStatus, error }) {
  return appendAuditEntries({
    user,
    action: `assessment:${assessmentId}:webhook:${status}`,
    oldValue: null,
    newValue: {
      callbackUrl,
      payload,
      responseStatus: responseStatus || null,
      error: error || null
    }
  });
}

async function logRecalculation({ assessmentId, user, oldAssessment, updatedFields, newResults }) {
  const entries = [];

  for (const [field, newValue] of Object.entries(updatedFields)) {
    entries.push({
      user,
      action: `assessment:${assessmentId}:update:${field}`,
      oldValue: oldAssessment.extracted.financials[field],
      newValue
    });
  }

  entries.push({
    user,
    action: `assessment:${assessmentId}:recalculate-score`,
    oldValue: {
      score: oldAssessment.results.score,
      decision: oldAssessment.results.decision,
      recommendedLimit: oldAssessment.results.recommendedLimit
    },
    newValue: {
      score: newResults.score,
      decision: newResults.decision,
      recommendedLimit: newResults.recommendedLimit
    }
  });

  return appendAuditEntries(entries);
}

async function logFinalReview({ assessmentId, user, oldAssessment, finalResults, notes }) {
  const entries = [
    {
      user,
      action: `assessment:${assessmentId}:final-decision`,
      oldValue: oldAssessment.results.decision,
      newValue: finalResults.decision
    },
    {
      user,
      action: `assessment:${assessmentId}:review-status`,
      oldValue: oldAssessment.metadata.status,
      newValue: 'reviewed'
    }
  ];

  if (notes) {
    entries.push({
      user,
      action: `assessment:${assessmentId}:review-notes`,
      oldValue: oldAssessment.results.humanReview?.notes || '',
      newValue: notes
    });
  }

  return appendAuditEntries(entries);
}

module.exports = {
  createAuditEntry,
  appendAuditEntries,
  logAssessmentCreated,
  logAssessmentQueued,
  logWebhookDelivery,
  logRecalculation,
  logFinalReview
};
