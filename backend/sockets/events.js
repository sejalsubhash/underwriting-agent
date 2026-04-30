const { EventEmitter } = require('events');
const Redis = require('ioredis');

const socketEvents = new EventEmitter();
const channelName = process.env.SOCKET_EVENTS_CHANNEL || 'assessment-progress-events';
let redisPublisher;

function getRedisPublisher() {
  if (redisPublisher) {
    return redisPublisher;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  redisPublisher = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1
  });

  redisPublisher.on('error', (err) => {
    console.error('[socket:redis-publisher:error]', err.message);
  });

  return redisPublisher;
}

async function publishAssessmentEvent(message) {
  const publisher = getRedisPublisher();

  try {
    if (publisher.status === 'wait') {
      await publisher.connect();
    }

    await publisher.publish(channelName, JSON.stringify(message));
  } catch (err) {
    console.error('[socket:publish:error]', {
      assessmentId: message.assessmentId,
      event: message.event,
      error: err.message
    });
  }
}

function emitAssessmentEvent(assessmentId, event, payload = {}) {
  const message = {
    assessmentId,
    event,
    timestamp: new Date().toISOString(),
    ...payload
  };

  console.log('[socket:event]', message);
  socketEvents.emit(event, message);
  socketEvents.emit(`assessment:${assessmentId}`, message);
  publishAssessmentEvent(message);
}

module.exports = {
  channelName,
  socketEvents,
  emitAssessmentEvent
};
