const { assessmentQueue } = require('../services/queue.service');
const s3Service = require('../services/s3.service');
const { detectDocuments } = require('../utils/document-detector');
const textractService = require('../services/textract.service');
const claudeService = require('../services/claude.service');
const externalApisService = require('../services/externalApis.service');
const calculationEngine = require('../services/calculation-engine');
const docxGenerator = require('../services/docx-generator');
const webhookService = require('../services/webhook.service');
const { emitAssessmentEvent } = require('../sockets/events');

async function setStatus(assessmentId, status, patch = {}, eventPayload = {}) {
  const metadata = await s3Service.updateAssessmentMetadata(assessmentId, {
    status,
    ...patch
  });

  emitAssessmentEvent(assessmentId, status, { status, ...eventPayload });
  return metadata;
}

assessmentQueue.process('process-assessment', async (job) => {
  const { assessmentId, caseId } = job.data;

  console.log('[worker:start]', {
    jobId: job.id,
    assessmentId,
    caseId
  });

  let metadata = await setStatus(assessmentId, 'processing', {
    processingStartedAt: new Date().toISOString(),
    queueJobId: job.id
  });

  console.log('[worker:processing]', {
    jobId: job.id,
    assessmentId,
    status: metadata.status
  });

  const documents = await s3Service.getAssessmentDocuments(assessmentId);
  const documentDetections = await detectDocuments(documents);
  await s3Service.writeAssessmentJson(assessmentId, 'document-detection.json', documentDetections);

  metadata = await setStatus(assessmentId, 'extracting');
  const textractOutputs = await textractService.extractScannedDocuments(documents, documentDetections);
  const extracted = await claudeService.extractUnderwritingData({
    metadata,
    documents,
    documentDetections,
    textractOutputs
  });
  await s3Service.writeAssessmentJson(assessmentId, 'textract-output.json', textractOutputs);
  await s3Service.writeAssessmentJson(assessmentId, 'extracted.json', extracted);

  await setStatus(assessmentId, 'calling-apis');
  const apiResponses = await externalApisService.fetchExternalApiResponses({
    metadata,
    extracted
  });

  for (const [apiName, response] of Object.entries(apiResponses)) {
    await s3Service.writeAssessmentJson(assessmentId, `api-responses/${apiName}.json`, response);
  }

  await setStatus(assessmentId, 'calculating');
  const results = calculationEngine.calculateAssessmentScore({
    extracted,
    apiResponses
  });
  await s3Service.writeAssessmentJson(assessmentId, 'results.json', results);

  const reportBuffer = await docxGenerator.generateAssessmentReport({
    metadata,
    extracted,
    results
  });
  await s3Service.writeAssessmentFile(assessmentId, 'report.docx', reportBuffer);

  await setStatus(
    assessmentId,
    'completed',
    {
      completedAt: new Date().toISOString()
    },
    {
      decision: results.decision,
      score: results.score
    }
  );
  await webhookService.deliverDecisionWebhook({
    assessmentId,
    metadata,
    results
  });

  return {
    assessmentId,
    status: 'completed',
    decision: results.decision,
    score: results.score
  };
});

assessmentQueue.on('completed', (job, result) => {
  console.log('[worker:completed]', {
    jobId: job.id,
    assessmentId: result.assessmentId,
    status: result.status
  });
});

assessmentQueue.on('failed', async (job, err) => {
  const assessmentId = job && job.data && job.data.assessmentId;

  console.error('[worker:failed]', {
    jobId: job && job.id,
    assessmentId,
    error: err.message
  });

  if (assessmentId) {
    await s3Service.updateAssessmentMetadata(assessmentId, {
      status: 'failed',
      failureReason: err.message
    });
  }
});

console.log('[worker] Assessment processor started');
