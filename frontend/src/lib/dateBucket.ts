import type { Message, Level } from '../types';

const LEVEL_PRIORITY: Record<Level, number> = { red: 3, yellow: 2, blue: 1 };

export function bucketByDate(messages: Message[]): Record<string, Message[]> {
  const buckets: Record<string, Message[]> = {};
  for (const m of messages) {
    if (!m.date) continue;
    const dateKey = m.date.split('T')[0];
    if (!buckets[dateKey]) buckets[dateKey] = [];
    buckets[dateKey].push(m);
  }
  // Sort keys descending
  const sorted: Record<string, Message[]> = {};
  Object.keys(buckets).sort().reverse().forEach(k => { sorted[k] = buckets[k]; });
  return sorted;
}

export function findTopLevelByDate(messages: Message[]): Record<string, Level> {
  const result: Record<string, Level> = {};
  for (const m of messages) {
    if (!m.date) continue;
    const dateKey = m.date.split('T')[0];
    const lvl = m.level || 'blue';
    if (!result[dateKey] || LEVEL_PRIORITY[lvl] > LEVEL_PRIORITY[result[dateKey]]) {
      result[dateKey] = lvl;
    }
  }
  return result;
}
