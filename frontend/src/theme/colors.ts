// Dark terminal theme color system (matching original RunnerXBT design)
export const colors = {
  bg: {
    base: '#0c100e',
    surface: '#121a14',
    elevated: '#182218',
    hover: '#1c281e',
  },
  border: {
    default: '#1e2a20',
    light: '#162016',
  },
  text: {
    primary: '#c8d8c8',
    secondary: '#80a080',
    muted: '#4a604a',
  },
  accent: {
    blue: '#4d9fff',
    green: '#33cc66',
    red: '#e04040',
    amber: '#ffb000',
  },
  level: {
    red: '#e04040',
    yellow: '#ffb000',
    blue: '#4d9fff',
  },
} as const;

export type ColorLevel = 'red' | 'yellow' | 'blue';
