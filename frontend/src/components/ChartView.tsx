import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CandlestickSeries, type IChartApi, ColorType, type CandlestickData, type Time } from 'lightweight-charts';
import type { TimeFrame, Symbol as SymbolType } from '../types';
import { colors } from '../theme/colors';



const API_MAP: Record<SymbolType, Record<TimeFrame, string>> = {
  btc: { '1d': '/api/btc', '4h': '/api/btc4h' },
  eth: { '1d': '/api/eth', '4h': '/api/eth' },
};

const SYMBOL_LABEL: Record<SymbolType, string> = { btc: 'BTC/USDT', eth: 'ETH/USDT' };
const TF_LABEL: Record<TimeFrame, string> = { '1d': '1D', '4h': '4H' };

function mapCandle(raw: { t: number; o: number; h: number; l: number; c: number; v: number }): CandlestickData {
  return {
    time: (raw.t / 1000) as Time,
    open: raw.o,
    high: raw.h,
    low: raw.l,
    close: raw.c,
  };
}

export function ChartView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const [symbol, setSymbol] = useState<SymbolType>('btc');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCandles = useCallback(async (sym: SymbolType, tf: TimeFrame) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_MAP[sym][tf]);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const candles: CandlestickData[] = (json.data || []).map(mapCandle);
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

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.bg.base },
        textColor: colors.text.muted,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: colors.border.light },
        horzLines: { color: colors.border.light },
      },
      rightPriceScale: {
        borderColor: colors.border.default,
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: colors.border.default,
        timeVisible: true,
      },
      crosshair: {
        vertLine: { color: colors.accent.amber, width: 1, style: 2 },
        horzLine: { color: colors.accent.amber, width: 1, style: 2 },
      },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: colors.accent.green,
      downColor: colors.accent.red,
      borderUpColor: colors.accent.green,
      borderDownColor: colors.accent.red,
      wickUpColor: colors.accent.green,
      wickDownColor: colors.accent.red,
    });
    chartRef.current = chart;
    seriesRef.current = series;

    loadCandles(symbol, timeFrame);

    const onResize = () => chart.applyOptions({ width: containerRef.current?.clientWidth || 0, height: containerRef.current?.clientHeight || 0 });
    window.addEventListener('resize', onResize);
    onResize();

    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current) loadCandles(symbol, timeFrame);
  }, [symbol, timeFrame, loadCandles]);

  const bd = colors.border.default;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: colors.bg.base }}>
      <div style={{ height: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", borderBottom: "1px solid " + bd }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(['btc', 'eth'] as SymbolType[]).map(s => (
            <button key={s} onClick={() => setSymbol(s)} style={{
              padding: "2px 10px", border: "none", borderRadius: 2,
              background: symbol === s ? colors.accent.green : 'transparent',
              color: symbol === s ? colors.bg.base : colors.text.muted,
              fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>{SYMBOL_LABEL[s]}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 2, background: colors.bg.surface, border: "1px solid " + bd, borderRadius: 2, padding: 2 }}>
          {(['1d', '4h'] as TimeFrame[]).map(tf => (
            <button key={tf} onClick={() => setTimeFrame(tf)} style={{
              padding: "2px 8px", border: "none", borderRadius: 2,
              background: timeFrame === tf ? colors.accent.green : 'transparent',
              color: timeFrame === tf ? colors.bg.base : colors.text.muted,
              fontSize: 10, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
            }}>{TF_LABEL[tf]}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text.muted, fontSize: 12, pointerEvents: 'none' }}>Loading chart...</div>}
        {error && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent.red, fontSize: 12 }}>{error}</div>}
      </div>
    </div>
  );
}