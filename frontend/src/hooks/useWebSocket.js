// frontend/src/hooks/useWebSocket.js
import { useEffect, useRef } from 'react';
import { useAlertStore } from '../store/alertStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost/ws';

export function useWebSocket() {
  const ws = useRef(null);
  const addAlert  = useAlertStore((s) => s.addAlert);
  const updateAlert = useAlertStore((s) => s.updateAlert);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({ type: 'AUTH', token }));
    };

    ws.current.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        switch (msg.type) {
          case 'ALERT_CREATED':
            addAlert({ ...msg.data, is_active: true, created_at: msg.timestamp });
            break;
          case 'ALERT_UPDATED':
            updateAlert(msg.data.alert_id, msg.data);
            break;
          default:
            break;
        }
      } catch (err) {
        console.warn('WebSocket parse error:', err);
      }
    };

    ws.current.onerror = (e) => console.warn('WebSocket error:', e);

    // Reconnect on close after 3s
    ws.current.onclose = () => {
      setTimeout(() => { ws.current = null; }, 3000);
    };

    return () => ws.current?.close();
  }, []);
}
