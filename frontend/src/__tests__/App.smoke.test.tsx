import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from '../App';

// Mock the hooks that make network calls
vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    status: 'disconnected' as const,
    lastMessage: null,
    send: vi.fn(),
  }),
}));

vi.mock('../hooks/useMessages', () => ({
  useMessages: () => ({
    messages: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

// Mock ChartView to avoid lightweight-charts color parsing issues in happy-dom
vi.mock('../components/ChartView', () => ({
  ChartView: () => <div data-testid="chart-view" />,
}));

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });
});
