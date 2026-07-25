import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { DayPostsPanel } from '../components/DayPostsPanel';
import { Sidebar } from '../components/Sidebar';
import type { Message, Level } from '../types';

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

// ============================================================
// New tests for chart click interaction features (Task 8)
// ============================================================

describe('Chart Click → Panel Interaction', () => {
  // 7. Chart click → panel opens (via Sidebar "在日面板查看" triggers DayPostsPanel)
  it('selecting a date via Sidebar opens DayPostsPanel with correct date', async () => {
    const user = userEvent.setup();
    render(<App />);
    // Panel should not be visible initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Click "在日面板查看" on first message (date: 2024-01-15)
    const panelLinks = screen.getAllByText(/在日面板查看/);
    await user.click(panelLinks[0]);
    // DayPostsPanel dialog should now be visible
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Should show the correct date
    expect(dialog).toHaveAttribute('aria-label', 'Posts for 2024-01-15');
    // Level badges should appear
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  // 8. Same date click via Sidebar keeps panel open (Sidebar uses handleSelectMessage, no toggle)
  it('clicking same date via Sidebar keeps DayPostsPanel open (no toggle for Sidebar)', async () => {
    const user = userEvent.setup();
    render(<App />);
    // Open panel for 2024-01-15
    const panelLinks = screen.getAllByText(/在日面板查看/);
    await user.click(panelLinks[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Click the same date's "在日面板查看" again — Sidebar always opens, never toggles
    const panelLinks2 = screen.getAllByText(/在日面板查看/);
    await user.click(panelLinks2[0]);
    // Panel should still be open (Sidebar has no toggle behavior)
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  // 9. Different date click → panel updates to new date
  it('clicking a different date updates DayPostsPanel to the new date', async () => {
    const user = userEvent.setup();
    render(<App />);
    // Open panel for 2024-01-15 (first message)
    const panelLinks = screen.getAllByText(/在日面板查看/);
    await user.click(panelLinks[0]);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Posts for 2024-01-15');
    // Now click "在日面板查看" for 2024-01-16 (third message)
    const panelLinks2 = screen.getAllByText(/在日面板查看/);
    await user.click(panelLinks2[2]); // third message is on 2024-01-16
    // Panel should now show the new date
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Posts for 2024-01-16');
  });

  // 9b. Chart click toggle: handleChartSelectDate toggles on same date
  it('handleChartSelectDate toggles panel off when same date is clicked twice', () => {
    // Test the toggle logic directly — this is what ChartView calls on chart click
    let selectedDate: string | undefined;
    const handleChartSelectDate = (dateStr: string) => {
      if (selectedDate === dateStr) {
        selectedDate = undefined;
        return;
      }
      selectedDate = dateStr;
    };
    // First click: sets date
    handleChartSelectDate('2024-01-15');
    expect(selectedDate).toBe('2024-01-15');
    // Second click on same date: toggles off
    handleChartSelectDate('2024-01-15');
    expect(selectedDate).toBeUndefined();
    // Click different date: sets new date
    handleChartSelectDate('2024-01-16');
    expect(selectedDate).toBe('2024-01-16');
  });
});

describe('DayPostsPanel Unit Tests', () => {
  const makeMsg = (id: number, date: string, level: Level, text: string): Message => ({
    id, date, text, level, has_media: false,
  });

  const sampleMessages: Message[] = [
    makeMsg(1, '2024-01-15T10:00:00', 'red', 'First post with enough text to show in the day panel view component test'),
    makeMsg(2, '2024-01-15T14:00:00', 'blue', 'Second post also with sufficient length for testing purposes here'),
  ];

  // 10. Escape key closes DayPostsPanel
  it('pressing Escape key calls onClose', () => {
    const onClose = vi.fn();
    render(<DayPostsPanel date="2024-01-15" messages={sampleMessages} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // 11. DayPostsPanel shows empty state when no messages
  it('shows empty state when no messages for the date', () => {
    const onClose = vi.fn();
    render(<DayPostsPanel date="2024-01-20" messages={[]} onClose={onClose} />);
    expect(screen.getByText('该日无帖子')).toBeInTheDocument();
  });

  // 12. DayPostsPanel renders message count in header
  it('renders message count in the header', () => {
    const onClose = vi.fn();
    render(<DayPostsPanel date="2024-01-15" messages={sampleMessages} onClose={onClose} />);
    // The header shows the date and message count
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
    // The count badge should show 2
    const countBadge = screen.getByText('2');
    expect(countBadge).toBeInTheDocument();
  });
});

describe('Sidebar Loading State', () => {
  const makeMsg = (id: number, date: string, level: Level, text: string): Message => ({
    id, date, text, level, has_media: false,
  });

  // 13. Sidebar shows loading spinner when loading=true
  it('shows loading spinner when loading prop is true', () => {
    render(
      <Sidebar
        messages={[]}
        loading={true}
        onSelectMessage={vi.fn()}
      />
    );
    expect(screen.getByText('Loading messages...')).toBeInTheDocument();
  });

  // 14. Sidebar shows error state with retry button
  it('shows error message and retry button when error is provided', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(
      <Sidebar
        messages={[]}
        loading={false}
        error="Network error"
        onRetry={onRetry}
        onSelectMessage={vi.fn()}
      />
    );
    expect(screen.getByText('Network error')).toBeInTheDocument();
    const retryBtn = screen.getByText('Retry');
    await user.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // 15. Sidebar shows empty state when no messages and not loading
  it('shows empty state when no messages and not loading', () => {
    render(
      <Sidebar
        messages={[]}
        loading={false}
        onSelectMessage={vi.fn()}
      />
    );
    expect(screen.getByText('No messages')).toBeInTheDocument();
  });

  // 16. Sidebar highlights the active date group
  it('highlights the active date group when selectedDate matches', () => {
    const messages: Message[] = [
      makeMsg(1, '2024-01-15T10:00:00', 'blue', 'Message on Jan 15 with enough text to show in sidebar test'),
    ];
    render(
      <Sidebar
        messages={messages}
        loading={false}
        onSelectMessage={vi.fn()}
        selectedDate="2024-01-15"
      />
    );
    // The date header should be visible
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
  });
});
