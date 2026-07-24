import { useState } from 'react';
import './theme/global.css';
import { useWebSocket } from './hooks/useWebSocket';
import { useMessages } from './hooks/useMessages';
import { ConnectionStatus } from './components/ConnectionStatus';
import { StatsBar } from './components/StatsBar';
import { Sidebar } from './components/Sidebar';
import { ChartView } from './components/ChartView';
import { MessageDetail } from './components/MessageDetail';
import { FilterBar } from './components/FilterBar';
import type { Message, Level } from './types';

export default function App() {
  const { status, lastMessage } = useWebSocket();
  const { messages, loading } = useMessages(lastMessage);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [filterLevels, setFilterLevels] = useState<Record<Level, boolean>>({
    red: true,
    yellow: true,
    blue: true,
  });

  const filteredMessages = messages.filter((m) => filterLevels[m.level || 'blue']);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    }}>
      <StatsBar messages={messages} loading={loading}>
        <ConnectionStatus status={status} />
      </StatsBar>
      <FilterBar filterLevels={filterLevels} onChange={setFilterLevels} />
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Sidebar
          messages={filteredMessages}
          onSelectMessage={setSelectedMessage}
          selectedId={selectedMessage?.id}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <ChartView messages={filteredMessages} />
        </div>
        {selectedMessage && (
          <MessageDetail message={selectedMessage} onClose={() => setSelectedMessage(null)} />
        )}
      </div>
    </div>
  );
}
