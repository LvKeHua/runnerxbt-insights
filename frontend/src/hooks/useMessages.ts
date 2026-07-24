import { useState, useEffect, useCallback } from 'react';
import type { Message, MessagesResponse } from '../types';

const API_BASE = '/api';

export function useMessages(wsMessage: Message | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load historical messages from REST API
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const res = await fetch(${API_BASE}/messages);
        if (!res.ok) throw new Error(HTTP );
        const data: MessagesResponse = await res.json();
        setMessages(data.data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, []);

  // Merge real-time messages from WebSocket
  useEffect(() => {
    if (!wsMessage) return;
    setMessages((prev) => {
      // Deduplicate by id
      if (prev.some((m) => m.id === wsMessage.id)) return prev;
      // Add new message and re-sort (newest first)
      return [wsMessage, ...prev];
    });
  }, [wsMessage]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(${API_BASE}/messages);
      if (!res.ok) throw new Error(HTTP );
      const data: MessagesResponse = await res.json();
      setMessages(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    }
  }, []);

  return { messages, loading, error, refresh };
}
