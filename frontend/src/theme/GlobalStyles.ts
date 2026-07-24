import { colors } from './colors';

export const globalStyles = 
  :root {
    --bg-base: ;
    --bg-surface: ;
    --bg-elevated: ;
    --bg-hover: ;
    --border: ;
    --border-light: ;
    --text-primary: ;
    --text-secondary: ;
    --text-muted: ;
    --accent-blue: ;
    --accent-green: ;
    --accent-red: ;
    --accent-amber: ;
    --level-red: ;
    --level-yellow: ;
    --level-blue: ;
    --side-w: 300px;
    --panel-w: 400px;
    --bar-h: 36px;
    --header-h: 36px;
    --radius: 2px;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #root { height: 100%; overflow: hidden; }
  body {
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    background: var(--bg-base);
    color: var(--text-primary);
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

  /* Link styles */
  a { color: var(--accent-blue); text-decoration: none; }
  a:hover { text-decoration: underline; }

  /* Button reset */
  button { cursor: pointer; font-family: inherit; }
;
