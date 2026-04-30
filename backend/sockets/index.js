const { Server } = require('socket.io');
const Redis = require('ioredis');
const { channelName, socketEvents } = require('./events');

function emitToAssessment(io, message) {
  io.to(`assessment:${message.assessmentId}`).emit(message.event, message);
  io.to(`assessment:${message.assessmentId}`).emit('assessment-progress', message);
}

function subscribeToLocalEvents(io) {
  const events = ['processing', 'extracting', 'calling-apis', 'calculating', 'completed'];

  for (const event of events) {
    socketEvents.on(event, (message) => {
      emitToAssessment(io, message);
    });
  }
}

function subscribeToRedisEvents(io) {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const subscriber = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null
  });

  subscriber.on('error', (err) => {
    console.error('[socket:redis-subscriber:error]', err.message);
  });

  subscriber.on('message', (_channel, rawMessage) => {
    try {
      const message = JSON.parse(rawMessage);
      emitToAssessment(io, message);
      console.log('[socket:relay]', {
        assessmentId: message.assessmentId,
        event: message.event
      });
    } catch (err) {
      console.error('[socket:relay:error]', err.message);
    }
  });

  subscriber
    .connect()
    .then(() => subscriber.subscribe(channelName))
    .then(() => {
      console.log('[socket:redis-subscriber]', { channelName });
    })
    .catch((err) => {
      console.error('[socket:redis-subscriber:connect-error]', err.message);
    });

  return subscriber;
}

function initializeSockets(httpServer, options = {}) {
  const io = new Server(httpServer, {
    cors: {
      origin: options.corsOrigin || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('[socket:connect]', { socketId: socket.id });

    socket.on('assessment:subscribe', ({ assessmentId } = {}) => {
      if (!assessmentId) {
        socket.emit('socket-error', { error: 'assessmentId is required' });
        return;
      }

      const room = `assessment:${assessmentId}`;
      socket.join(room);
      socket.emit('assessment:subscribed', {
        assessmentId,
        room,
        timestamp: new Date().toISOString()
      });

      console.log('[socket:subscribe]', {
        socketId: socket.id,
        assessmentId
      });
    });

    socket.on('assessment:unsubscribe', ({ assessmentId } = {}) => {
      if (assessmentId) {
        socket.leave(`assessment:${assessmentId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket:disconnect]', {
        socketId: socket.id,
        reason
      });
    });
  });

  subscribeToLocalEvents(io);
  const redisSubscriber = subscribeToRedisEvents(io);

  return {
    io,
    redisSubscriber
  };
}

module.exports = {
  initializeSockets
};
