const Bull = require('bull');

const queueName = process.env.ASSESSMENT_QUEUE_NAME || 'assessment-processing';
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const assessmentQueue = new Bull(queueName, redisUrl, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000
    },
    removeOnComplete: 100,
    removeOnFail: false
  }
});

assessmentQueue.on('error', (err) => {
  console.error('[queue:error]', err.message);
});

assessmentQueue.on('waiting', (jobId) => {
  console.log('[queue:waiting]', { jobId, queueName });
});

assessmentQueue.on('failed', (job, err) => {
  console.error('[queue:failed]', {
    jobId: job && job.id,
    assessmentId: job && job.data && job.data.assessmentId,
    error: err.message
  });
});

async function addAssessmentJob(payload) {
  const job = await assessmentQueue.add('process-assessment', payload);

  console.log('[queue:add]', {
    jobId: job.id,
    assessmentId: payload.assessmentId
  });

  return job;
}

module.exports = {
  assessmentQueue,
  addAssessmentJob
};
