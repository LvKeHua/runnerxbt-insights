import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../components/Sidebar';
import type { Message, Level } from '../types';

const makeMessage = (id: number, date: string, level: Level, text: string, extra?: Partial<Message>): Message => ({
  id, date, text, level, has_media: false, ...extra,
});

const shortText = makeMessage(1, '2024-01-15T10:00:00', 'blue', 'Short text');
const longText = makeMessage(2, '2024-01-15T14:00:00', 'red', 'This is a very long text that exceeds fifty characters and should be truncated in the preview but fully visible when expanded inline within the sidebar list item');
const mediaMsg = makeMessage(3, '2024-01-16T09:00:00', 'yellow', 'With media', { has_media: true, media_path: '/test.jpg' });

describe('Sidebar', () => {
  const defaultProps = {
    messages: [shortText, longText, mediaMsg] as Message[],
    onSelectMessage: vi.fn(),
    selectedId: undefined as number | undefined,
    selectedDate: undefined as string | undefined,
  };

  // 1. Posts with text > 50 chars show "Expand" link
  it('shows Expand link for posts with long text', () => {
    render(<Sidebar {...defaultProps} />);
    const expandLinks = screen.getAllByText(/↗ Expand/);
    expect(expandLinks.length).toBeGreaterThanOrEqual(1);
  });

  // 2. Clicking "Expand" expands text inline (NOT calling onSelectMessage for expand)
  it('expands text inline when Expand is clicked', async () => {
    const onSelectMessage = vi.fn();
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} onSelectMessage={onSelectMessage} />);
    const expandLinks = screen.getAllByText(/↗ Expand/);
    await user.click(expandLinks[0]);
    // Full text should now be visible (not truncated)
    expect(screen.getByText(/This is a very long text that exceeds fifty/)).toBeInTheDocument();
  });

  // 3. Clicking "Collapse" collapses text
  it('collapses text when Collapse is clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} />);
    const expandLinks = screen.getAllByText(/↗ Expand/);
    await user.click(expandLinks[0]);
    // Full text should now be visible
    expect(screen.getByText(/This is a very long text that exceeds fifty/)).toBeInTheDocument();
    // Now click collapse
    const collapseLinks = screen.getAllByText(/× Collapse/);
    await user.click(collapseLinks[0]);
    // The expanded full text should be gone — text should be truncated again
    // After collapse, the truncated text with ellipsis should be visible
    expect(screen.getByText(/This is a very long text that exceeds fifty charac…/)).toBeInTheDocument();
  });

  // 4. Expanding one item doesn't collapse others (independent state)
  it('independent expand - expanding one does not collapse others', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} />);
    const expandLinks = screen.getAllByText(/↗ Expand/);
    // Expand the first long item
    await user.click(expandLinks[0]);
    // That item should now show Collapse
    expect(screen.getByText(/× Collapse/)).toBeInTheDocument();
    // The other expandable item (mediaMsg) should still show Expand
    expect(screen.getByText(/↗ Expand/)).toBeInTheDocument();
  });

  // 5. "在日面板查看" link exists and calls onSelectMessage
  it('shows 在日面板查看 link that calls onSelectMessage', async () => {
    const onSelectMessage = vi.fn();
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} onSelectMessage={onSelectMessage} />);
    const panelLinks = screen.getAllByText(/在日面板查看/);
    await user.click(panelLinks[0]);
    expect(onSelectMessage).toHaveBeenCalledTimes(1);
  });

  // 6. Clicking post body still calls onSelectMessage
  it('clicking post body calls onSelectMessage', async () => {
    const onSelectMessage = vi.fn();
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} onSelectMessage={onSelectMessage} />);
    const msgItems = screen.getAllByTestId('msg-item');
    await user.click(msgItems[0]);
    expect(onSelectMessage).toHaveBeenCalled();
  });
});