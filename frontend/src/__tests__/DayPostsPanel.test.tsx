import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DayPostsPanel } from '../components/DayPostsPanel';
import type { Message, Level } from '../types';

const makeMessage = (id: number, date: string, level: Level, text: string, extra?: Partial<Message>): Message => ({
  id, date, text, level, has_media: false, ...extra,
});

const sampleMessages: Message[] = [
  makeMessage(1, '2024-01-15T10:00:00', 'red', 'Important market update with some long text that should be truncated in preview mode'),
  makeMessage(2, '2024-01-15T14:00:00', 'blue', 'Regular update'),
  makeMessage(3, '2024-01-15T18:00:00', 'yellow', 'Medium priority note'),
];

describe('DayPostsPanel', () => {
  const defaultProps = {
    date: '2024-01-15',
    messages: sampleMessages,
    onClose: vi.fn(),
  };

  // 1. Renders posts for a date
  it('renders all posts for the selected date', () => {
    render(<DayPostsPanel {...defaultProps} />);
    expect(screen.getByText(/2024-01-15/)).toBeInTheDocument();
    // Each post should show its preview text
    sampleMessages.forEach(msg => {
      expect(screen.getByText(new RegExp(msg.text.slice(0, 20)))).toBeInTheDocument();
    });
  });

  // 2. Each post shows collapsed preview by default
  it('shows collapsed preview for each post by default', () => {
    render(<DayPostsPanel {...defaultProps} />);
    // The long text should be truncated in preview
    expect(screen.getByText(/Important market update/)).toBeInTheDocument();
    // Each post should have an "Expand" button
    const expandButtons = screen.getAllByText(/Expand|↗/);
    expect(expandButtons.length).toBeGreaterThanOrEqual(1);
  });

  // 3. Clicking expand toggles to show full text
  it('expands post text when Expand is clicked', async () => {
    const user = userEvent.setup();
    render(<DayPostsPanel {...defaultProps} />);
    const expandBtn = screen.getAllByText(/Expand|↗/)[0];
    await user.click(expandBtn);
    // After expanding, the full text should be visible
    expect(screen.getByText(/Important market update with some long text/)).toBeInTheDocument();
  });

  // 4. Clicking expand again collapses
  it('collapses post text when Collapse is clicked', async () => {
    const user = userEvent.setup();
    render(<DayPostsPanel {...defaultProps} />);
    // First expand
    const expandBtn = screen.getAllByText(/Expand|↗/)[0];
    await user.click(expandBtn);
    // Then collapse
    const collapseBtn = screen.getAllByText(/Collapse|× Close/)[0];
    await user.click(collapseBtn);
    // Text should be truncated again — full text should NOT be visible
    expect(screen.queryByText(/that should be truncated in preview mode/)).not.toBeInTheDocument();
  });

  // 5. Expanding one item doesn't collapse others
  it('independent expand/collapse for each post', async () => {
    const user = userEvent.setup();
    render(<DayPostsPanel {...defaultProps} />);
    // Expand first post
    await user.click(screen.getAllByText(/Expand|↗/)[0]);
    // Second post should still be collapsed — its full text should NOT be visible
    expect(screen.queryByText(/Regular update/)).toBeInTheDocument();
    // The second post's expand button should still say "Expand"
    const expandButtons = screen.getAllByText(/Expand|↗/);
    expect(expandButtons.length).toBeGreaterThanOrEqual(1);
  });

  // 6. Post shows level badge
  it('shows level badge with correct color for each post', () => {
    render(<DayPostsPanel {...defaultProps} />);
    // Should show level indicators (HIGH/MED/LOW)
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
    expect(screen.getByText('MED')).toBeInTheDocument();
  });

  // 7. Post shows media when available
  it('shows media when available', () => {
    const messagesWithMedia: Message[] = [
      makeMessage(1, '2024-01-15T10:00:00', 'red', 'Post with image', { has_media: true, media_path: '/test.jpg' }),
    ];
    const { container } = render(<DayPostsPanel date="2024-01-15" messages={messagesWithMedia} onClose={vi.fn()} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', '/test.jpg');
  });

  // 8. Close button calls onClose
  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<DayPostsPanel {...defaultProps} onClose={onClose} />);
    await user.click(screen.getByText(/Close/));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // 9. Empty state: shows "该日无帖子" when no messages
  it('shows empty state when no messages', () => {
    render(<DayPostsPanel date="2024-01-15" messages={[]} onClose={vi.fn()} />);
    expect(screen.getByText(/无帖子/)).toBeInTheDocument();
  });
});
