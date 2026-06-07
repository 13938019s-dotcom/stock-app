import { useEffect, useRef, useMemo } from 'react';
import {
  createChart, CandlestickSeries, LineSeries, HistogramSeries,
  ColorType, LineStyle, createSeriesMarkers,
} from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';
import type { OHLCV, Indicators, FibLevel } from '../types/stock';

interface Props {
  ohlcv: OHLCV[];
  indicators: Indicators;
  fibLevels?: FibLevel[];
  showFib?: boolean;
  showMACDCross?: boolean;
  showKDCross?: boolean;
}

export function MainChart({ ohlcv, indicators, fibLevels = [], showFib = false, showMACDCross = false, showKDCross = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const hasPossibleSplit = useMemo(() => {
    for (let i = 1; i < ohlcv.length; i++) {
      if (ohlcv[i - 1].close > 0 && ohlcv[i].close / ohlcv[i - 1].close < 0.5) return true;
    }
    return false;
  }, [ohlcv]);

  useEffect(() => {
    if (!containerRef.current || ohlcv.length === 0) return;
    const el = containerRef.current;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: '#0c1628' },
        textColor: '#64748b',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
      },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      rightPriceScale: { borderColor: '#1e293b' },
      timeScale: { borderColor: '#1e293b', timeVisible: true, rightOffset: 2, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { mode: 1 },
      width: el.clientWidth,
      height: 380,
    });
    chartRef.current = chart;

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#ef4444', downColor: '#22c55e',
      borderVisible: false,
      wickUpColor: '#ef4444', wickDownColor: '#22c55e',
    });
    candle.setData(ohlcv.map(d => ({ time: d.date as any, open: d.open, high: d.high, low: d.low, close: d.close })));

    // ── Cross markers on the K-line (only when toggled on) ──────────────────
    if (showMACDCross || showKDCross) {
      type Marker = { time: string; position: 'aboveBar' | 'belowBar'; color: string; shape: 'arrowUp' | 'arrowDown'; text: string; size: number };
      const markers: Marker[] = [];

      for (let i = 1; i < ohlcv.length; i++) {
        const date = ohlcv[i].date;
        if (showMACDCross) {
          const pm = indicators.macdLine[i - 1], ps = indicators.macdSignal[i - 1];
          const cm = indicators.macdLine[i],     cs = indicators.macdSignal[i];
          if (pm !== null && ps !== null && cm !== null && cs !== null) {
            if (pm <= ps && cm > cs) markers.push({ time: date, position: 'belowBar', color: '#34d399', shape: 'arrowUp',   text: 'MACD', size: 1 });
            else if (pm >= ps && cm < cs) markers.push({ time: date, position: 'aboveBar', color: '#fb7185', shape: 'arrowDown', text: 'MACD', size: 1 });
          }
        }
        if (showKDCross) {
          const pk = indicators.kdK[i - 1], pd = indicators.kdD[i - 1];
          const ck = indicators.kdK[i],     cd = indicators.kdD[i];
          if (!isNaN(pk) && !isNaN(pd) && !isNaN(ck) && !isNaN(cd)) {
            if (pk <= pd && ck > cd) markers.push({ time: date, position: 'belowBar', color: '#818cf8', shape: 'arrowUp',   text: 'KD', size: 1 });
            else if (pk >= pd && ck < cd) markers.push({ time: date, position: 'aboveBar', color: '#fbbf24', shape: 'arrowDown', text: 'KD', size: 1 });
          }
        }
      }
      markers.sort((a, b) => a.time.localeCompare(b.time));
      createSeriesMarkers(candle, markers as any);
    }
    // ────────────────────────────────────────────────────────────────────────

    const addLine = (data: (number | null)[], color: string, width: 1 | 2, style?: number) => {
      const s = chart.addSeries(LineSeries, {
        color, lineWidth: width,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        lineStyle: style ?? LineStyle.Solid,
      });
      s.setData(
        data.map((v, i) => v !== null ? { time: ohlcv[i].date as any, value: v } : null).filter(Boolean) as any
      );
    };

    addLine(indicators.ma5,             '#f59e0b', 1);
    addLine(indicators.ma20,            '#3b82f6', 2);
    addLine(indicators.ma60,            '#8b5cf6', 1);
    addLine(indicators.bollingerUpper,  '#334155', 1, LineStyle.Dashed);
    addLine(indicators.bollingerMiddle, '#1e293b', 1, LineStyle.Dotted);
    addLine(indicators.bollingerLower,  '#334155', 1, LineStyle.Dashed);

    if (showFib && fibLevels.length > 0) {
      const fibColors: Record<string, string> = { '0.382': '#f59e0b', '0.5': '#ef4444', '0.618': '#22c55e', '0.786': '#8b5cf6' };
      fibLevels.forEach(f => {
        if (f.ratio === 0 || f.ratio === 1) return;
        candle.createPriceLine({
          price: f.price,
          color: fibColors[String(f.ratio)] ?? '#475569',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: `Fib ${f.label}`,
          axisLabelVisible: false,
        });
      });
    }

    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
    vol.setData(ohlcv.map(d => ({
      time: d.date as any,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
    })));

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(entries => {
      if (entries[0]) chart.applyOptions({ width: entries[0].contentRect.width });
    });
    ro.observe(el);

    return () => { ro.disconnect(); chart.remove(); };
  }, [ohlcv, indicators, fibLevels, showFib, showMACDCross, showKDCross]);

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-600 mb-2">
        <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-amber-400 inline-block" />MA5</span>
        <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-blue-500 inline-block" />MA20</span>
        <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-purple-500 inline-block" />MA60</span>
        <span className="flex items-center gap-1.5"><span className="w-5 border-b border-dashed border-slate-600 inline-block" />布林通道</span>
        {showFib && <span className="flex items-center gap-1.5 text-amber-500 font-medium">✦ Fibonacci</span>}
        {showMACDCross && (
          <span className="border-l border-slate-700/60 pl-4 flex items-center gap-3">
            <span className="flex items-center gap-1" style={{ color: '#34d399' }}>▲ <span className="text-slate-600">MACD黃金</span></span>
            <span className="flex items-center gap-1" style={{ color: '#fb7185' }}>▼ <span className="text-slate-600">MACD死叉</span></span>
          </span>
        )}
        {showKDCross && (
          <span className="border-l border-slate-700/60 pl-4 flex items-center gap-3">
            <span className="flex items-center gap-1" style={{ color: '#818cf8' }}>▲ <span className="text-slate-600">KD黃金</span></span>
            <span className="flex items-center gap-1" style={{ color: '#fbbf24' }}>▼ <span className="text-slate-600">KD死叉</span></span>
          </span>
        )}
      </div>
      {hasPossibleSplit && (
        <div className="flex items-center gap-1.5 text-xs text-amber-500/70 mb-1">
          <span>⚠</span>
          <span>圖表偵測到可能未還原的受益單位分割，歷史價格僅供參考</span>
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
