import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import type { Level } from '../types';

// Mock WebSocket hook
vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => ({ status: 'connected' as const, lastMessage: null }),
}));

// Mock useMessages with data that has text > 50 chars (required for "在日面板查看" link)
vi.mock('../hooks/useMessages', () => ({
  useMessages: () => ({
    messages: [
      { id: 1, date: '2024-01-15T10:00:00', text: 'First post of the day with some content that is long enough to trigger the expand link in sidebar', level: 'red' as Level, has_media: false },
      { id: 2, date: '2024-01-15T14:00:00', text: 'Second post with enough text to show the day panel view link in the sidebar component', level: 'blue' as Level, has_media: false },
      { id: 3, date: '2024-01-16T09:00:00', text: 'Post on another day with sufficient length for the link to appear in sidebar', level: 'yellow' as Level, has_media: false },
    ],
    loading: false,
    refresh: vi.fn(),
  }),
}));

// Mock lightweight-charts since it can't run in happy-dom
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => ({})),
    subscribeClick: vi.fn(),
    timeScale: vi.fn(() => ({
      fitContent: vi.fn(),
      setVisibleRange: vi.fn(),
      getVisibleRange: vi.fn(() => ({ from: 0, to: 0 })),
      subscribeVisibleTimeRangeChange: vi.fn(),
    })),
    applyOptions: vi.fn(),
    remove: vi.fn(),
    priceScale: vi.fn(() => ({ applyOptions: vi.fn() })),
  })),
  CandlestickSeries: vi.fn(),
  HistogramSeries: vi.fn(),
  createSeriesMarkers: vi.fn(() => ({ setMarkers: vi.fn() })),
  ColorType: { Solid: 1 },
}));

describe('Integration: Click-to-Panel Flow', () => {
  beforeEach(() => {
    // Mock fetch for ChartView candle loading
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    }));
  });

  // 1. App renders without crashing
  it('renders the app with all components', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  // 2. Sidebar shows messages
  it('sidebar displays messages', () => {
    render(<App />);
    // Should show message previews in the sidebar
    expect(screen.getByText(/First post of the day/)).toBeInTheDocument();
    expect(screen.getByText(/Second post/)).toBeInTheDocument();
  });

  // 3. DayPostsPanel not visible initially (no date selected)
  it('DayPostsPanel is not visible when no date is selected', () => {
    render(<App />);
    // Should NOT show "该日无帖子" or date header initially
    expect(screen.queryByText(/无帖子/)).not.toBeInTheDocument();
  });

  // 4. Sidebar "在日面板查看" link opens DayPostsPanel
  it('clicking "在日面板查看" opens DayPostsPanel for that date', async () => {
    const user = userEvent.setup();
    render(<App />);
    // DayPostsPanel level badges should NOT be visible initially
    expect(screen.queryByText('HIGH')).not.toBeInTheDocument();
    // Find and click "在日面板查看" link
    const panelLinks = screen.getAllByText(/在日面板查看/);
    await user.click(panelLinks[0]);
    // DayPostsPanel should now be visible — level badges appear
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  // 5. Expand/collapse works in DayPostsPanel
  it('expand/collapse works in DayPostsPanel', async () => {
    const user = userEvent.setup();
    render(<App />);
    // Open DayPostsPanel first
    const panelLinks = screen.getAllByText(/在日面板查看/);
    await user.click(panelLinks[0]);
    // Find and click Expand inside the DayPostsPanel (glass-panel)
    const panel = document.querySelector('.glass-panel');
    expect(panel).not.toBeNull();
    const expandBtns = Array.from(panel!.querySelectorAll('span')).filter(el => el.textContent?.includes('↗ Expand'));
    expect(expandBtns.length).toBeGreaterThanOrEqual(1);
    await user.click(expandBtns[0]);
    // Full text should now be visible
    expect(screen.getByText(/First post of the day with some content that is long enough/)).toBeInTheDocument();
  });

  // 6. Close button in DayPostsPanel closes the panel
  it('close button in DayPostsPanel closes the panel', async () => {
    const user = userEvent.setup();
    render(<App />);
    // Open DayPostsPanel first
    const panelLinks = screen.getAllByText(/在日面板查看/);
    await user.click(panelLinks[0]);
    // DayPostsPanel level badges should be visible
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    // Find and click Close button in the panel
    const closeBtns = screen.getAllByRole('button');
    const panelCloseBtn = closeBtns.find(btn => btn.textContent?.includes('Close') && btn.closest('.glass-panel'));
    if (panelCloseBtn) {
      await user.click(panelCloseBtn);
    }
    // DayPostsPanel level badges should be gone (panel closed)
    expect(screen.queryByText('HIGH')).not.toBeInTheDocument();
  });
});
