import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const WSContext = createContext(null);
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

export function WSProvider({ orgId, children }) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const listenersRef = useRef({});
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (!orgId) return;
    const token = localStorage.getItem('openclaw_token') || '';
    const wsUrl = BACKEND_URL.replace(/^https?/, (m) => m === 'https' ? 'wss' : 'ws');
    const url = `${wsUrl}/ws/org/${orgId}?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen  = () => { setConnected(true); };
    ws.onclose = () => {
      setConnected(false);
      // reconnect after 3s
      reconnectTimer.current = setTimeout(connect, 3000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const cbs = listenersRef.current[msg.event] || [];
        cbs.forEach(cb => cb(msg.data));
        // also fire '*' listeners
        const all = listenersRef.current['*'] || [];
        all.forEach(cb => cb(msg));
      } catch {}
    };
  }, [orgId]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const on = useCallback((event, cb) => {
    listenersRef.current[event] = [...(listenersRef.current[event] || []), cb];
    return () => {
      listenersRef.current[event] = (listenersRef.current[event] || []).filter(x => x !== cb);
    };
  }, []);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return (
    <WSContext.Provider value={{ connected, on, send }}>
      {children}
    </WSContext.Provider>
  );
}

const WS_DEFAULT = {
  connected: false,
  on: () => () => {},  // returns unsubscribe noop
  send: () => {},
};

export const useWS = () => {
  const ctx = useContext(WSContext);
  return ctx || WS_DEFAULT;
};
