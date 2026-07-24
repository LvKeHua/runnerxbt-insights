import type { Message } from '../types';
import { colors } from '../theme/colors';

interface Props { message: Message; onClose: () => void; }

const levelLabels: Record<string, string> = { red: 'HIGH', yellow: 'MED', blue: 'LOW' };

export function MessageDetail({ message, onClose }: Props) {
  const level = message.level || 'blue';
  const bd = colors.border.default;
  return (
    <div style={{ width: 400, minWidth: 400, background: colors.bg.surface, borderLeft: '1px solid ' + bd, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid ' + bd, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: colors.text.secondary }}>{message.date?.split('T')[0]} {message.timestamp || ''} {levelLabels[level]}</span>
        <button onClick={onClose} style={{ background: 'none', border: '1px solid ' + bd, color: colors.text.muted, fontSize: 12, padding: '2px 8px', borderRadius: 2 }}>Close</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: colors.text.primary }}>{message.text}</p>
        {message.links && message.links.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 10, color: colors.text.muted, textTransform: 'uppercase' }}>Links</span>
            {message.links.map((link, i) => <a key={i} href={link} target='_blank' rel='noopener' style={{ display: 'block', fontSize: 11, color: colors.accent.blue, marginTop: 4 }}>{link}</a>)}
          </div>
        )}
        {message.images && message.images.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {message.images.map((img, i) => <img key={i} src={img} alt='' loading='lazy' style={{ maxWidth: '100%', borderRadius: 2, marginTop: 8 }} />)}
          </div>
        )}
      </div>
    </div>
  );
}