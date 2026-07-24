import { useState } from 'react';
import type { Message } from '../types';
import { colors } from '../theme/colors';

interface Props { messages: Message[]; onSelectMessage: (msg: Message) => void; selectedId?: number; }

export function Sidebar({ messages, onSelectMessage, selectedId }: Props) {
  const [search, setSearch] = useState('');
  const filtered = messages.filter((m) => !search || (m.text || '').toLowerCase().includes(search.toLowerCase()));
  const bd = colors.border.default;
  const bl = colors.border.light;
  const ag = colors.accent.green;
  const grouped: Record<string, Message[]> = {};
  for (const m of filtered) { const date = m.date?.split('T')[0] || 'Unknown'; if (!grouped[date]) grouped[date] = []; grouped[date].push(m); }
  return (
    <div style={{ width: 300, minWidth: 300, background: colors.bg.surface, borderRight: '1px solid ' + bd, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 200ms ease' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid ' + bd, display: 'flex', justifyContent: 'space-between', minHeight: 36 }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3px', color: colors.text.muted }}>Timeline</span>
        <span style={{ fontSize: 9, background: colors.bg.elevated, color: colors.text.secondary, padding: '1px 6px', borderRadius: 2 }}>{filtered.length}</span>
      </div>
      <div style={{ padding: '6px 12px', borderBottom: '1px solid ' + bl }}>
        <input type="text" placeholder="Search messages..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', background: colors.bg.base, border: '1px solid ' + bd, borderRadius: 2, padding: '4px 8px', color: colors.text.primary, fontSize: 11, fontFamily: 'inherit', outline: 'none' }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            <div style={{ padding: '10px 12px 4px 28px', fontSize: 10, color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{date} <span style={{ fontSize: 9, background: colors.bg.elevated, padding: '0 5px', borderRadius: 2 }}>{msgs.length}</span></div>
            {msgs.map((m) => (
              <div key={m.id} onClick={() => onSelectMessage(m)} style={{ padding: '5px 12px 5px 28px', cursor: 'pointer', borderLeft: m.id === selectedId ? '2px solid ' + ag : '2px solid transparent', background: m.id === selectedId ? 'rgba(51,204,102,0.08)' : 'transparent', transition: 'all .1s', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 1, background: bl }} />
                <div style={{ fontSize: 9, color: colors.text.muted, marginBottom: 1 }}><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.level[m.level || 'blue'], marginRight: 4, verticalAlign: 'middle' }} />{m.timestamp || ''}</div>
                <div style={{ fontSize: 11, color: colors.text.primary, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{(m.text || '').slice(0, 80)}{m.has_media ? ' ATT' : ''}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}