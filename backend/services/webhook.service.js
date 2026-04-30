const s3Service = require('./s3.service');
const auditService = require('./audit.service');

const webhookTimeoutMs = Number(process.env.WEBHOOK_TIMEOUT_MS || 5000);

function validateCallbackUrl(callbackUrl) {
  if (!callbackUrl) {
    return null;
  }

  try {
    const parsed = new URL(callbackUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Callback URL must use http or https');
    }

    return parsed.toString();
  } catch (err) {
    const validationError = new Error(`Invalid callbackUrl: ${err.message}`);
    validationError.statusCode = 400;
    throw validationError;
  }
}

async function deliverDecisionWebhook({ assessmentId, metadata, results }) {
  if (!metadata.callbackUrl) {
    console.log('[webhook:skip]', {
      assessmentId,
      reason: 'callbackUrl not configured'
    });
    return null;
  }

  const payload = {
    id: assessmentId,
    decision: results.decision,
    score: results.score
  };
  const attemptedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), webhookTimeoutMs);

  let delivery;
  let callbackUrl = metadata.callbackUrl;

  try {
    callbackUrl = validateCallbackUrl(metadata.callbackUrl);

    console.log('[webhook:post]', {
      assessmentId,
      callbackUrl,
      payload
    });

    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    delivery = {
      callbackUrl,
      payload,
      status: response.ok ? 'delivered' : 'failed',
      responseStatus: response.status,
      attemptedAt,
      completedAt: new Date().toISOString()
    };
  } catch (err) {
    delivery = {
      callbackUrl,
      payload,
      status: 'failed',
      responseStatus: null,
      error: err.name === 'AbortError' ? 'Webhook request timed out' : err.message,
      attemptedAt,
      completedAt: new Date().toISOString()
    };
  } finally {
    clearTimeout(timeout);
  }

  await s3Service.writeAssessmentJson(assessmentId, 'webhook-delivery.json', delivery);
  await auditService.logWebhookDelivery({
    assessmentId,
    user: 'worker',
    callbackUrl,
    payload,
    status: delivery.status,
    responseStatus: delivery.responseStatus,
    error: delivery.error
  });
  await s3Service.updateAssessmentMetadata(assessmentId, {
    webhookStatus: delivery.status,
    webhookLastAttemptAt: delivery.completedAt
  });

  console.log('[webhook:result]', {
    assessmentId,
    status: delivery.status,
    responseStatus: delivery.responseStatus,
    error: delivery.error
  });

  return delivery;
}

module.exports = {
  validateCallbackUrl,
  deliverDecisionWebhook
};
