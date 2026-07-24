import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// Mock lightweight-charts before importing ChartView
vi.mock('lightweight-charts', () => {
  const mockTimeScale = {
    fitContent: vi.fn(),
    setVisibleRange: vi.fn(),
    getVisibleRange: vi.fn(() => ({ from: 0, to: 0 })),
    subscribeVisibleTimeRangeChange: vi.fn(),
  };

  const mockChart = {
    addSeries: vi.fn(() => ({})),
    subscribeClick: vi.fn(),
    timeScale: vi.fn(() => mockTimeScale),
    applyOptions: vi.fn(),
    remove: vi.fn(),
    priceScale: vi.fn(() => ({ applyOptions: vi.fn() })),
  };

  return {
    createChart: vi.fn(() => mockChart),
    CandlestickSeries: vi.fn(),
    HistogramSeries: vi.fn(),
    createSeriesMarkers: vi.fn(() => ({ setMarkers: vi.fn() })),
    ColorType: { Solid: 1 },
  };
});

import { ChartView } from '../components/ChartView';
import type { Message, Level } from '../types';

const makeMessage = (id: number, date: string, level: Level, text: string): Message => ({
  id,
  date,
  text,
  level,
  has_media: false,
});

describe('ChartView', () => {
  const messages: Message[] = [
    makeMessage(1, '2024-01-15T10:00:00', 'red', 'Important message'),
    makeMessage(2, '2024-01-17T14:00:00', 'blue', 'Regular message'),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. ChartView renders without crashing
  it('renders without crashing', () => {
    const onSelectMessage = vi.fn();
    const onSelectDate = vi.fn();
    const { container } = render(
      <ChartView messages={messages} onSelectMessage={onSelectMessage} onSelectDate={onSelectDate} />
    );
    expect(container).toBeTruthy();
  });

  // 2. Component accepts onSelectDate and onSelectMessage props
  it('accepts onSelectDate and onSelectMessage props', () => {
    const onSelectMessage = vi.fn();
    const onSelectDate = vi.fn();
    const { container } = render(
      <ChartView messages={messages} onSelectMessage={onSelectMessage} onSelectDate={onSelectDate} />
    );
    // Component renders (if it doesn't crash, the props are accepted)
    expect(container).toBeTruthy();
  });

  // 3. Empty messages array doesn't crash
  it('handles empty messages array', () => {
    const { container } = render(
      <ChartView messages={[]} onSelectMessage={vi.fn()} onSelectDate={vi.fn()} />
    );
    expect(container).toBeTruthy();
  });

  // 4. Renders symbol and timeframe toggle buttons
  it('renders symbol and timeframe toggle buttons', () => {
    const { getByText } = render(
      <ChartView messages={messages} onSelectMessage={vi.fn()} onSelectDate={vi.fn()} />
    );
    expect(getByText('BTC/USDT')).toBeTruthy();
    expect(getByText('ETH/USDT')).toBeTruthy();
    expect(getByText('1D')).toBeTruthy();
    expect(getByText('4H')).toBeTruthy();
  });

  // 5. Shows loading state initially
  it('shows loading state initially', () => {
    const { getByText } = render(
      <ChartView messages={messages} onSelectMessage={vi.fn()} onSelectDate={vi.fn()} />
    );
    expect(getByText('Loading chart...')).toBeTruthy();
  });
});
