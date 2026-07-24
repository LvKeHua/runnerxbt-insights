import type { Message } from '../types';
import { colors } from '../theme/colors';

interface Props { message: Message; onClose: () => void; }

const levelLabels: Record<string, string> = { red: 'HIGH', yellow: 'MED', blue: 'LOW' };
const levelColors: Record<string, string> = { red: colors.accent.red, yellow: colors.accent.amber, blue: colors.accent.blue };

export function MessageDetail({ message, onClose }: Props) {
  const level = message.level || 'blue';
  const bd = colors.border.default;
  return (
    <div className='glass-panel' style={{ width: 400, minWidth: 400, background: 'rgba(18, 26, 20, 0.92)', borderLeft: '1px solid ' + bd, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid ' + bd, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: levelColors[level], boxShadow: '0 0 6px ' + levelColors[level] }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: levelColors[level], letterSpacing: '0.5px' }}>{levelLabels[level]}</span>
          <span style={{ fontSize: 10, color: colors.text.muted }}>{(message.date || '').split('T')[0]}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: '1px solid ' + bd, color: colors.text.muted, fontSize: 11, padding: '2px 8px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: colors.text.primary }}>{message.text}</p>
        {message.links && message.links.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 10, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Links</span>
            {message.links.map((link, i) => <a key={i} href={link} target='_blank' rel='noopener' style={{ display: 'block', fontSize: 11, color: colors.accent.blue, marginTop: 4 }}>{link}</a>)}
          </div>
        )}
        {message.images && message.images.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {message.images.map((img, i) => <img key={i} src={img} alt='' loading='lazy' style={{ maxWidth: '100%', borderRadius: 4, marginTop: 8, border: '1px solid ' + bd }} />)}
          </div>
        )}
        {message.has_media && message.media_path && (
          <div style={{ marginTop: 12 }}>
            <img src={message.media_path} alt='media' loading='lazy' style={{ maxWidth: '100%', borderRadius: 4, border: '1px solid ' + bd }} />
          </div>
        )}
      </div>
    </div>
  );
}