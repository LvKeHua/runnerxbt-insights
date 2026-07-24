import type { Level } from '../types';
import { colors } from '../theme/colors';

interface Props {
  filterLevels: Record<Level, boolean>;
  onChange: (levels: Record<Level, boolean>) => void;
}

const levels: { key: Level; label: string; color: string }[] = [
  { key: 'red', label: 'RED', color: colors.level.red },
  { key: 'yellow', label: 'YELLOW', color: colors.level.yellow },
  { key: 'blue', label: 'BLUE', color: colors.level.blue },
];

export function FilterBar({ filterLevels, onChange }: Props) {
  const toggle = (key: Level) => {
    onChange({ ...filterLevels, [key]: !filterLevels[key] });
  };

  return (
    <div style={{
      height: 28, minHeight: 28, display: 'flex', alignItems: 'center',
      background: colors.bg.surface, borderBottom: 1px solid ,
      padding: '0 10px', gap: 4, fontSize: 11,
    }}>
      <span style={{ color: colors.text.muted, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.3px', marginRight: 2 }}>Filter</span>
      {levels.map(({ key, label, color }) => (
        <button
          key={key}
          onClick={() => toggle(key)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 8px',
            borderRadius: 2, cursor: 'pointer', userSelect: 'none', fontSize: 10,
            border: 1px solid ,
            background: filterLevels[key] ? 'rgba(255,255,255,0.05)' : 'transparent',
            color: filterLevels[key] ? color : colors.text.muted,
            fontFamily: 'inherit',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />
          {label}
        </button>
      ))}
    </div>
  );
}
