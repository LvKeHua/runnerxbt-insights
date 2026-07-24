import { useState } from 'react';
import type { Message } from '../types';
import { colors } from '../theme/colors';

interface Props {
  date: string;
  messages: Message[];
  onClose: () => void;
}

const levelLabels: Record<string, string> = { red: 'HIGH', yellow: 'MED', blue: 'LOW' };
const levelColors: Record<string, string> = { red: colors.accent.red, yellow: colors.accent.amber, blue: colors.accent.blue };

function isVideoPath(path: string): boolean {
  return /\.(mp4|webm|mov|avi)$/i.test(path);
}

export function DayPostsPanel({ date, messages, onClose }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bd = colors.border.default;

  if (messages.length === 0) {
    return (
      <div className="glass-panel" style={{ width: 400, minWidth: 400, background: 'rgba(18, 26, 20, 0.92)', borderLeft: '1px solid ' + bd, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid ' + bd, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: colors.text.muted }}>{date}</span>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid ' + bd, color: colors.text.muted, fontSize: 11, padding: '2px 8px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text.muted, fontSize: 12 }}>
          该日无帖子
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ width: 400, minWidth: 400, background: 'rgba(18, 26, 20, 0.92)', borderLeft: '1px solid ' + bd, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid ' + bd, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary }}>{date} <span style={{ fontSize: 9, background: colors.bg.elevated, padding: '0 5px', borderRadius: 2, marginLeft: 4 }}>{messages.length}</span></span>
        <button onClick={onClose} style={{ background: 'none', border: '1px solid ' + bd, color: colors.text.muted, fontSize: 11, padding: '2px 8px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {messages.map((m) => {
          const level = m.level || 'blue';
          const isExpanded = expandedIds.has(m.id);
          const preview = (m.text || '').replace(/\*\*/g, '').replace(/\n/g, ' ').slice(0, 50);
          const hasMedia = m.has_media && m.media_path;
          const isVideo = hasMedia && isVideoPath(m.media_path!);

          return (
            <div key={m.id} style={{ padding: '8px 12px', borderBottom: '1px solid ' + colors.border.light, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: levelColors[level], boxShadow: '0 0 6px ' + levelColors[level] }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: levelColors[level], letterSpacing: '0.5px' }}>{levelLabels[level]}</span>
                <span style={{ fontSize: 9, color: colors.text.muted }}>{m.timestamp || ''}</span>
                <span style={{ marginLeft: 'auto', fontSize: 9, color: colors.accent.blue, cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 2 }} onClick={() => toggleExpand(m.id)}>
                  {isExpanded ? '× Close' : '↗ Expand'}
                </span>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.5, color: colors.text.primary, whiteSpace: isExpanded ? 'pre-wrap' : 'normal', wordBreak: 'break-word' }}>
                {isExpanded ? m.text : preview}{!isExpanded && (m.text || '').length > 50 ? '…' : ''}
              </div>
              {/* Show media thumbnail in collapsed state, full media in expanded state */}
              {hasMedia && !isExpanded && (
                <div style={{ marginTop: 4 }}>
                  {isVideo ? (
                    <video src={m.media_path} style={{ width: '100%', maxHeight: 80, borderRadius: 2, objectFit: 'cover' }} muted preload="metadata" />
                  ) : (
                    <img src={m.media_path} alt="" loading="lazy" style={{ width: '100%', maxHeight: 80, borderRadius: 2, objectFit: 'cover' }} />
                  )}
                </div>
              )}
              {isExpanded && m.links && m.links.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 9, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Links</span>
                  {m.links.map((link, i) => <a key={i} href={link} target="_blank" rel="noopener" style={{ display: 'block', fontSize: 10, color: colors.accent.blue, marginTop: 2 }}>{link}</a>)}
                </div>
              )}
              {isExpanded && hasMedia && (
                <div style={{ marginTop: 8 }}>
                  {isVideo ? (
                    <video controls style={{ maxWidth: '100%', borderRadius: 4, border: '1px solid ' + bd }}><source src={m.media_path} /></video>
                  ) : (
                    <img src={m.media_path} alt="" loading="lazy" style={{ maxWidth: '100%', borderRadius: 4, border: '1px solid ' + bd }} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
