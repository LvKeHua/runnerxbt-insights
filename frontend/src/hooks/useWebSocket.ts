import { useState, useEffect, useCallback, useRef } from 'react';
import type { ConnectionStatus, WSMessage, Message } from '../types';

const WS_URL = ws://:8000/ws;
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
      // Start ping interval
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, PING_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        if (msg.type === 'new_message' && msg.data) {
          setLastMessage(msg.data as Message);
        }
        // Reset ping timer on any message
        if (pingTimer.current) {
          clearInterval(pingTimer.current);
          pingTimer.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send('ping');
          }, PING_INTERVAL);
        }
      } catch {
        // Non-JSON message (pong)
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      if (pingTimer.current) clearInterval(pingTimer.current);
      // Auto reconnect with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), MAX_RECONNECT_DELAY);
      reconnectAttempt.current += 1;
      setStatus('reconnecting');
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };

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

  const send = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  return { status, lastMessage, send };
}
