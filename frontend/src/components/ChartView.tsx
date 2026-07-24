import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, createSeriesMarkers, ColorType, type CandlestickData, type Time } from 'lightweight-charts';
import type { TimeFrame, Symbol as SymbolType, Message } from '../types';
import { colors } from '../theme/colors';

interface Props {
  messages: Message[];
  onSelectMessage: (msg: Message) => void;
  onSelectDate?: (dateStr: string) => void;
  selectedDate?: string;
}

const API_MAP: Record<SymbolType, Record<TimeFrame, string>> = {
  btc: { '1d': '/runnerxbt/api/btc', '4h': '/runnerxbt/api/btc4h' },
  eth: { '1d': '/runnerxbt/api/eth', '4h': '/runnerxbt/api/eth' },
};
const SYMBOL_LABEL: Record<SymbolType, string> = { btc: 'BTC/USDT', eth: 'ETH/USDT' };
const TF_LABEL: Record<TimeFrame, string> = { '1d': '1D', '4h': '4H' };
const LEVEL_COLORS: Record<string, string> = { red: '#e04040', yellow: '#ffb000', blue: '#4d9fff' };

function mapCandle(raw: { t: number; o: number; h: number; l: number; c: number; v: number }): CandlestickData {
  return { time: (raw.t / 1000) as Time, open: raw.o, high: raw.h, low: raw.l, close: raw.c };
}

export function ChartView({ messages, onSelectMessage, onSelectDate, selectedDate }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const densityRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const densityChartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const densitySeriesRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const highlightMarkersRef = useRef<any>(null);
  const candleDataRef = useRef<any[]>([]);
  const messagesRef = useRef<Message[]>(messages);
  const onSelectMessageRef = useRef(onSelectMessage);
  const onSelectDateRef = useRef(onSelectDate);
  const [symbol, setSymbol] = useState<SymbolType>('btc');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep refs in sync
  messagesRef.current = messages;
  onSelectMessageRef.current = onSelectMessage;
  onSelectDateRef.current = onSelectDate;

  const loadCandles = useCallback(async (sym: SymbolType, tf: TimeFrame) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_MAP[sym][tf]);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const candles: CandlestickData[] = (json.data || []).map(mapCandle);
      candleDataRef.current = candles;
      if (seriesRef.current) {
        seriesRef.current.setData(candles);
        chartRef.current?.timeScale().fitContent();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update markers when messages or candle data change
  useEffect(() => {
    if (!seriesRef.current || !messages.length) return;
    const candles = candleDataRef.current;
    if (!candles.length) return;

    // Build date-to-candle mapping
    const dateToCandle: Record<string, number> = {};
    candles.forEach((c: any) => {
      const d = new Date((c.time as number) * 1000).toISOString().slice(0, 10);
      if (timeFrame === '4h' && dateToCandle[d] !== undefined) return;
      dateToCandle[d] = c.time as number;
    });

    // Count messages per date, find top level
    const msgCountByDate: Record<string, number> = {};
    const topLevelByDate: Record<string, string> = {};
    const levelPriority: Record<string, number> = { red: 3, yellow: 2, blue: 1 };
    messages.forEach(m => {
      if (!m.date) return;
      const dateKey = m.date.split('T')[0];
      msgCountByDate[dateKey] = (msgCountByDate[dateKey] || 0) + 1;
      const lvl = m.level || 'blue';
      if (!topLevelByDate[dateKey] || levelPriority[lvl] > levelPriority[topLevelByDate[dateKey]]) {
        topLevelByDate[dateKey] = lvl;
      }
    });

    // Build markers
    const markers: any[] = [];
    for (const [date, count] of Object.entries(msgCountByDate)) {
      const chartTime = dateToCandle[date];
      if (chartTime === undefined) continue;
      const topLvl = topLevelByDate[date] || 'blue';
      let shape: string, position: string, size: number, color: string;
      if (count > 5) {
        shape = 'arrowUp'; color = LEVEL_COLORS[topLvl] || LEVEL_COLORS.blue;
        size = Math.min(count, 5); position = 'belowBar';
      } else if (count > 2) {
        shape = 'circle'; color = LEVEL_COLORS[topLvl] || LEVEL_COLORS.blue;
        size = 3; position = 'aboveBar';
      } else {
        shape = 'circle'; color = LEVEL_COLORS[topLvl] || LEVEL_COLORS.blue;
        size = 2; position = 'aboveBar';
      }
      markers.push({ time: chartTime as Time, position, color, shape, size, text: '' + count });
    }

    markers.sort((a: any, b: any) => (a.time as number) - (b.time as number));
    if (markers.length > 500) {
      const step = Math.ceil(markers.length / 400);
      markersRef.current.setMarkers(markers.filter((_: any, i: number) => i % step === 0));
    } else {
      markersRef.current.setMarkers(markers);
    }

    // Update density histogram
    if (densitySeriesRef.current) {
      const densityData: any[] = [];
      candles.forEach((c: any) => {
        const d = new Date((c.time as number) * 1000).toISOString().slice(0, 10);
        const count = msgCountByDate[d] || 0;
        if (count > 0) {
          densityData.push({ time: c.time, value: count, color: LEVEL_COLORS[topLevelByDate[d] || 'blue'] || LEVEL_COLORS.blue });
        }
      });
      densitySeriesRef.current.setData(densityData);
    }
  }, [messages, timeFrame]);

  // Zoom chart to selected date & add highlight marker
  useEffect(() => {
    if (!selectedDate || !chartRef.current) return;
    const candles = candleDataRef.current;
    if (!candles.length) return;
    for (const c of candles) {
      const d = new Date((c.time as number) * 1000).toISOString().slice(0, 10);
      if (d === selectedDate) {
        const from = ((c.time as number) - 86400 * 7) as Time;
        const to = ((c.time as number) + 86400 * 10) as Time;
        chartRef.current.timeScale().setVisibleRange({ from, to });
        break;
      }
    }
  }, [selectedDate]);

  // Highlight marker for selected date
  useEffect(() => {
    if (!seriesRef.current || !highlightMarkersRef.current) return;
    if (!selectedDate) {
      highlightMarkersRef.current.setMarkers([]);
      return;
    }
    const candles = candleDataRef.current;
    if (!candles.length) return;
    for (const c of candles) {
      const d = new Date((c.time as number) * 1000).toISOString().slice(0, 10);
      if (d === selectedDate) {
        highlightMarkersRef.current.setMarkers([
          {
            time: c.time as Time,
            position: 'inBar',
            color: colors.accent.green,
            shape: 'arrowDown',
            size: 2,
            text: '▼',
          },
        ]);
        return;
      }
    }
    highlightMarkersRef.current.setMarkers([]);
  }, [selectedDate]);

  // Create chart on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: colors.bg.base }, textColor: colors.text.muted, fontSize: 11 },
      grid: { vertLines: { color: colors.border.light }, horzLines: { color: colors.border.light } },
      rightPriceScale: { borderColor: colors.border.default, scaleMargins: { top: 0.1, bottom: 0.25 } },
      timeScale: { borderColor: colors.border.default, timeVisible: true },
      crosshair: { vertLine: { color: colors.accent.amber, width: 1, style: 2 }, horzLine: { color: colors.accent.amber, width: 1, style: 2 } },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: colors.accent.green, downColor: colors.accent.red,
      borderUpColor: colors.accent.green, borderDownColor: colors.accent.red,
      wickUpColor: colors.accent.green, wickDownColor: colors.accent.red,
    });

    // Density chart
    let densityChart: any = null;
    let densitySeries: any = null;
    try {
      if (densityRef.current) {
        densityChart = createChart(densityRef.current, {
          layout: { background: { type: ColorType.Solid, color: colors.bg.base }, textColor: colors.text.muted, fontSize: 9 },
          grid: { vertLines: { color: colors.border.light }, horzLines: { color: 'transparent' } },
          timeScale: { borderColor: colors.border.default, visible: false, fixLeftEdge: true, fixRightEdge: true },
          rightPriceScale: { visible: false },
          handleScale: false, handleScroll: false,
        });
        densitySeries = densityChart.addSeries(HistogramSeries, {
          color: '#4d9fff', priceFormat: { type: 'volume' }, priceScaleId: '',
        });
        densityChart.priceScale('').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.2 } });
        chart.timeScale().subscribeVisibleTimeRangeChange(() => {
          if (!densityChart) return;
          const range = chart.timeScale().getVisibleRange();
          if (range && typeof range.from === 'number' && typeof range.to === 'number' && isFinite(range.from) && isFinite(range.to)) densityChart.timeScale().setVisibleRange(range);
        });
        densityChart.subscribeClick((param: any) => {
          if (!param.time) return;
          const time = typeof param.time === 'number' ? param.time : (param.time as any).timestamp || param.time;
          chart.timeScale().setVisibleRange({ from: ((time as number) - 86400 * 10) as Time, to: ((time as number) + 86400 * 5) as Time });
          // Also select date on density chart click
          const dateKey = new Date((time as number) * 1000).toISOString().slice(0, 10);
          onSelectDateRef.current?.(dateKey);
        });
      }
    } catch (e) { console.warn('Density chart init failed:', e); }

    // Chart click -> always select date (DayPostsPanel handles empty state)
    chart.subscribeClick((param: any) => {
      if (!param.time) return;
      const time = typeof param.time === 'number' ? param.time : (param.time as any).timestamp || param.time;
      const dateKey = new Date((time as number) * 1000).toISOString().slice(0, 10);
      // Always call onSelectDate - DayPostsPanel will show posts or empty state
      onSelectDateRef.current?.(dateKey);
      // Zoom chart to clicked time
      chart.timeScale().setVisibleRange({ from: ((time as number) - 86400 * 7) as Time, to: ((time as number) + 86400 * 10) as Time });
    });

    chartRef.current = chart;
    seriesRef.current = series;
    markersRef.current = createSeriesMarkers(series, []);
    highlightMarkersRef.current = createSeriesMarkers(series, []);
    densityChartRef.current = densityChart;
    densitySeriesRef.current = densitySeries;

    loadCandles(symbol, timeFrame);

    const onResize = () => {
      chart.applyOptions({ width: containerRef.current?.clientWidth || 0, height: containerRef.current?.clientHeight || 0 });
      if (densityChart && densityRef.current) densityChart.applyOptions({ width: densityRef.current.clientWidth || 0, height: densityRef.current.clientHeight || 0 });
    };
    window.addEventListener('resize', onResize);
    onResize();

    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
      if (densityChart) densityChart.remove();
      chartRef.current = null; seriesRef.current = null; markersRef.current = null; highlightMarkersRef.current = null;
      densityChartRef.current = null; densitySeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current) loadCandles(symbol, timeFrame);
  }, [symbol, timeFrame, loadCandles]);

  const bd = colors.border.default;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: colors.bg.base }}>
      <div style={{ height: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', borderBottom: '1px solid ' + bd }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['btc', 'eth'] as SymbolType[]).map(s => (
            <button key={s} onClick={() => setSymbol(s)} style={{ padding: '2px 10px', border: 'none', borderRadius: 2, background: symbol === s ? colors.accent.green : 'transparent', color: symbol === s ? colors.bg.base : colors.text.muted, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{SYMBOL_LABEL[s]}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 2, background: colors.bg.surface, border: '1px solid ' + bd, borderRadius: 2, padding: 2 }}>
          {(['1d', '4h'] as TimeFrame[]).map(tf => (
            <button key={tf} onClick={() => setTimeFrame(tf)} style={{ padding: '2px 8px', border: 'none', borderRadius: 2, background: timeFrame === tf ? colors.accent.green : 'transparent', color: timeFrame === tf ? colors.bg.base : colors.text.muted, fontSize: 10, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>{TF_LABEL[tf]}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text.muted, fontSize: 12, pointerEvents: 'none' }}>Loading chart...</div>}
        {error && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent.red, fontSize: 12 }}>{error}</div>}
      </div>
      <div ref={densityRef} style={{ height: 60, minHeight: 60, borderTop: '1px solid ' + bd }} />
    </div>
  );
}
