import type { ConnectionStatus as Status } from '../types';
import { colors } from '../theme/colors';

interface Props { status: Status; }

export function ConnectionStatus({ status }: Props) {
  const colorMap: Record<Status, string> = { connected: colors.accent.green, connecting: colors.accent.amber, disconnected: colors.accent.red, reconnecting: colors.accent.amber };
  const labelMap: Record<Status, string> = { connected: 'Connected', connecting: 'Connecting...', disconnected: 'Disconnected', reconnecting: 'Reconnecting...' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colorMap[status], animation: status === 'reconnecting' ? 'pulse 1s infinite' : 'none' }} />
      <span style={{ color: colors.text.muted }}>{labelMap[status]}</span>
      <style>{'@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }'}</style>
    </div>
  );
}