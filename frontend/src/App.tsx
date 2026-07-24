import { useState } from 'react';
import './theme/global.css';
import { useWebSocket } from './hooks/useWebSocket';
import { useMessages } from './hooks/useMessages';
import { ConnectionStatus } from './components/ConnectionStatus';
import { StatsBar } from './components/StatsBar';
import { Sidebar } from './components/Sidebar';
import { ChartView } from './components/ChartView';
import { FilterBar } from './components/FilterBar';
import { DayPostsPanel } from './components/DayPostsPanel';
import type { Message, Level } from './types';
import { colors } from './theme/colors';

export default function App() {
  const { status, lastMessage } = useWebSocket();
  const { messages, loading, refresh } = useMessages(lastMessage);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [filterLevels, setFilterLevels] = useState<Record<Level, boolean>>({
    red: true,
    yellow: true,
    blue: true,
  });

  const filteredMessages = messages.filter((m) => filterLevels[m.level || 'blue']);

  const handleSelectMessage = (msg: Message) => {
    setSelectedMessage(msg);
    setSelectedDate(msg.date ? msg.date.split('T')[0] : undefined);
  };

  const handleChartSelectDate = (dateStr: string) => {
    // Toggle: clicking same date closes panel
    if (selectedDate === dateStr) {
      setSelectedDate(undefined);
      return;
    }
    setSelectedDate(dateStr);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    }}>
      <StatsBar messages={messages} loading={loading}>
        <ConnectionStatus status={status} />
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            marginLeft: 8, background: 'transparent', border: '1px solid ' + colors.border.default,
            color: colors.text.muted, fontSize: 10, padding: '2px 8px', borderRadius: 2, cursor: 'pointer',
          }}
        >
          {sidebarOpen ? 'Hide' : 'Show'} Timeline
        </button>
        <button
          onClick={async () => {
            try {
              await fetch('/runnerxbt/api/refresh');
            } catch { /* skip if backend refresh unavailable */ }
            refresh();
          }}
          title="Fetch new messages from Telegram & refresh"
          style={{
            marginLeft: 6, background: 'transparent', border: '1px solid ' + colors.border.default,
            color: colors.text.muted, fontSize: 10, padding: '2px 8px', borderRadius: 2, cursor: 'pointer',
          }}
        >
          ↻ Refresh
        </button>
      </StatsBar>
      <FilterBar filterLevels={filterLevels} onChange={setFilterLevels} />
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {sidebarOpen && (
          <Sidebar
            messages={filteredMessages}
            onSelectMessage={handleSelectMessage}
            selectedId={selectedMessage?.id}
            selectedDate={selectedDate}
          />
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <ChartView
            messages={filteredMessages}
            onSelectMessage={handleSelectMessage}
            onSelectDate={handleChartSelectDate}
            selectedDate={selectedDate}
          />
        </div>
        {selectedDate && (
          <DayPostsPanel
            date={selectedDate}
            messages={filteredMessages.filter(m => m.date && m.date.startsWith(selectedDate))}
            onClose={() => setSelectedDate(undefined)}
          />
        )}
      </div>
    </div>
  );
}