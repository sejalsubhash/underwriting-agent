import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getApiBaseUrl } from '../services/api.js';

const progressOrder = ['processing', 'extracting', 'calling-apis', 'calculating', 'completed'];

export default function useAssessmentSocket(assessmentId) {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!assessmentId) {
      return undefined;
    }

    const socket = io(getApiBaseUrl(), {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('assessment:subscribe', { assessmentId });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('assessment-progress', (message) => {
      setEvents((current) => {
        const withoutDuplicate = current.filter((item) => item.event !== message.event);
        return [...withoutDuplicate, message].sort(
          (a, b) => progressOrder.indexOf(a.event) - progressOrder.indexOf(b.event)
        );
      });
    });

    return () => {
      socket.emit('assessment:unsubscribe', { assessmentId });
      socket.disconnect();
    };
  }, [assessmentId]);

  return {
    connected,
    events,
    progressOrder
  };
}
