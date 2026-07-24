import type { Message } from '../types';
import { colors } from '../theme/colors';
import type { ReactNode } from 'react';

interface Props {
  messages: Message[];
  loading: boolean;
  children: ReactNode;
}

export function StatsBar({ messages, loading, children }: Props) {
  const total = messages.length;
  return (
    <div style={{
      height: 36, minHeight: 36, display: 'flex', alignItems: 'center',
      background: colors.bg.surface, borderBottom: 1px solid ,
      padding: '0 12px', fontSize: 12, gap: 10, zIndex: 20, userSelect: 'none',
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: colors.accent.amber, paddingRight: 10, borderRight: 1px solid  }}>
        RunnerXBT
      </span>
      {loading ? (
        <span style={{ color: colors.text.muted }}>Loading...</span>
      ) : (
        <span style={{ color: colors.text.secondary }}>{total} messages</span>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {children}
      </div>
    </div>
  );
}
