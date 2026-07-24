import type { Message } from '../types';
import { colors } from '../theme/colors';

interface Props {
  messages: Message[];
  onSelectMessage: (msg: Message) => void;
}

export function ChartView({ messages, onSelectMessage }: Props) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: colors.bg.base }}>
      <div style={{ height: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', borderBottom: 1px solid  }}>
        <span style={{ fontSize: 12, fontWeight: 500 }}>BTC/USDT 1D</span>
        <div style={{ display: 'flex', gap: 2, background: colors.bg.surface, border: 1px solid , borderRadius: 2, padding: 2 }}>
          <button style={{ padding: '2px 8px', border: 'none', borderRadius: 2, background: colors.accent.green, color: colors.bg.base, fontSize: 10, fontWeight: 500 }}>1D</button>
          <button style={{ padding: '2px 8px', border: 'none', borderRadius: 2, background: 'transparent', color: colors.text.muted, fontSize: 10, fontWeight: 500 }}>4H</button>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text.muted, fontSize: 14 }}>
        Chart loading... (LightweightCharts integration in Wave 3)
      </div>
    </div>
  );
}
