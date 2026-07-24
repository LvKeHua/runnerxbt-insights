import { useState, useEffect, useCallback, useRef } from 'react';
import type { ConnectionStatus, Message } from '../types';

const WS_URL = ((window.location.protocol === 'https:') ? 'wss://' : 'ws://') + window.location.host + '/runnerxbt/ws';
const MAX_RECONNECT_DELAY = 30000;
const PING_INTERVAL = 30000;

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setStatus('connecting');
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      setStatus('connected');
      reconnectAttempt.current = 0;
      pingTimer.current = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send('ping'); }, PING_INTERVAL);
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'new_message' && msg.data) setLastMessage(msg.data as Message);
        if (pingTimer.current) { clearInterval(pingTimer.current); pingTimer.current = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send('ping'); }, PING_INTERVAL); }
      } catch { /* pong or non-JSON */ }
    };
    ws.onclose = () => {
      setStatus('disconnected');
      if (pingTimer.current) clearInterval(pingTimer.current);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), MAX_RECONNECT_DELAY);
      reconnectAttempt.current += 1;
      setStatus('reconnecting');
      reconnectTimer.current = setTimeout(connect, delay);
    };
    ws.onerror = () => { ws.close(); };
    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (pingTimer.current) clearInterval(pingTimer.current);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: string) => { if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(data); }, []);
  return { status, lastMessage, send };
}