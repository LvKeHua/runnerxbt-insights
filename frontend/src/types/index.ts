export type Level = 'red' | 'yellow' | 'blue';

export interface Message {
  id: number;
  date: string | null;
  text: string;
  level: Level;
  timestamp?: string;
  group?: string | null;
  has_media: boolean;
  media_path?: string;
  images?: string[];
  links?: string[];
}

export interface DailyStats {
  date: string;
  count: number;
  messages: Message[];
}

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SymbolData {
  symbol: string;
  total: number;
  data: OHLCV[];
}

export interface StatusResponse {
  messages: number;
  days: number;
  btc_candles: number;
  eth_candles: number;
  media_files: number;
  project: string;
  updated: string;
  ws_connections?: number;
}

export interface MessagesResponse {
  total: number;
  data: Message[];
}

export type TimeFrame = '1d' | '4h';
export type Symbol = 'btc' | 'eth';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WSMessage {
  type: 'new_message' | 'status' | 'ping';
  data?: Message | StatusResponse;
}
