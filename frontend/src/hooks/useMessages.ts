import { useState, useEffect, useCallback } from 'react';
import type { Message, MessagesResponse } from '../types';

const API_BASE = '/runnerxbt/api';

export function useMessages(wsMessage: Message | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const res = await fetch(API_BASE + '/messages');
        if (!res.ok) throw new Error('HTTP ' + res.status);
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

  useEffect(() => {
    if (!wsMessage) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === wsMessage.id)) return prev;
      return [wsMessage, ...prev];
    });
  }, [wsMessage]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(API_BASE + '/messages');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data: MessagesResponse = await res.json();
      setMessages(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    }
  }, []);

  return { messages, loading, error, refresh };
}