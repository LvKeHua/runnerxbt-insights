import { describe, it, expect } from 'vitest';
import { bucketByDate, findTopLevelByDate } from '../lib/dateBucket';
import type { Message, Level } from '../types';

// Helper to create test messages
const makeMessage = (id: number, date: string, level: Level, text = 'test'): Message => ({
  id, date, text, level, has_media: false,
});

describe('bucketByDate', () => {
  it('groups messages by date', () => {
    const msgs = [
      makeMessage(1, '2024-01-15T10:00:00', 'red'),
      makeMessage(2, '2024-01-15T14:00:00', 'blue'),
      makeMessage(3, '2024-01-16T09:00:00', 'yellow'),
    ];
    const result = bucketByDate(msgs);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result['2024-01-15']).toHaveLength(2);
    expect(result['2024-01-16']).toHaveLength(1);
  });

  it('handles null dates by skipping them', () => {
    const msgs = [
      makeMessage(1, '2024-01-15T10:00:00', 'red'),
      { id: 2, date: null, text: 'no date', level: 'blue' as Level, has_media: false },
    ];
    const result = bucketByDate(msgs);
    expect(Object.keys(result)).toHaveLength(1);
    expect(result['2024-01-15']).toHaveLength(1);
  });

  it('returns empty object for empty array', () => {
    expect(bucketByDate([])).toEqual({});
  });

  it('sorts dates in descending order', () => {
    const msgs = [
      makeMessage(1, '2024-01-10T10:00:00', 'blue'),
      makeMessage(2, '2024-01-15T10:00:00', 'red'),
    ];
    const result = bucketByDate(msgs);
    const dates = Object.keys(result);
    expect(dates[0]).toBe('2024-01-15');
    expect(dates[1]).toBe('2024-01-10');
  });
});

describe('findTopLevelByDate', () => {
  it('finds highest priority level per date', () => {
    const msgs = [
      makeMessage(1, '2024-01-15T10:00:00', 'blue'),
      makeMessage(2, '2024-01-15T14:00:00', 'red'),
      makeMessage(3, '2024-01-16T09:00:00', 'yellow'),
    ];
    const result = findTopLevelByDate(msgs);
    expect(result['2024-01-15']).toBe('red');
    expect(result['2024-01-16']).toBe('yellow');
  });

  it('defaults to blue when no messages', () => {
    expect(findTopLevelByDate([])).toEqual({});
  });
});
