import { useEffect, useRef, useMemo, useState } from 'react';
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

const PANE_HEIGHTS = { main: 320, volume: 80, rsi: 90, kd: 90, macd: 100, bias: 80 };
const COLLAPSED_H = 22;

export function MainChart({ ohlcv, indicators, fibLevels = [], showFib = false, showMACDCross = false, showKDCross = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(true);
  const [showKD, setShowKD] = useState(true);
  const [showMACD, setShowMACD] = useState(true);
  const [showBias, setShowBias] = useState(true);

  const offsetVolume = PANE_HEIGHTS.main;
  const offsetRSI = offsetVolume + (showVolume ? PANE_HEIGHTS.volume : COLLAPSED_H);
  const offsetKD = offsetRSI + (showRSI ? PANE_HEIGHTS.rsi : COLLAPSED_H);
  const offsetMACD = offsetKD + (showKD ? PANE_HEIGHTS.kd : COLLAPSED_H);
  const offsetBias = offsetMACD + (showMACD ? PANE_HEIGHTS.macd : COLLAPSED_H);

  const hasPossibleSplit = useMemo(() => {
    for (let i = 1; i < ohlcv.length; i++) {
      if (ohlcv[i - 1].close > 0 && ohlcv[i].close / ohlcv[i - 1].close < 0.5) return true;
    }
    return false;
  }, [ohlcv]);

  useEffect(() => {
    if (!containerRef.current || ohlcv.length === 0) return;
    const el = containerRef.current;

    const totalHeight = PANE_HEIGHTS.main
      + (showVolume ? PANE_HEIGHTS.volume : COLLAPSED_H)
      + (showRSI ? PANE_HEIGHTS.rsi : COLLAPSED_H)
      + (showKD ? PANE_HEIGHTS.kd : COLLAPSED_H)
      + (showMACD ? PANE_HEIGHTS.macd : COLLAPSED_H)
      + (showBias ? PANE_HEIGHTS.bias : COLLAPSED_H);

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: '#0c1628' },
        textColor: '#64748b',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        panes: { separatorColor: '#1e293b', separatorHoverColor: 'rgba(59,130,246,0.1)' },
      },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      rightPriceScale: { borderColor: '#1e293b' },
      timeScale: { borderColor: '#1e293b', timeVisible: true, rightOffset: 2, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { mode: 1 },
      width: el.clientWidth,
      height: totalHeight,
    });
    chartRef.current = chart;

    // ── Pane 0: Candles + MA + Bollinger ─────────────────────────────────────
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#ef4444', downColor: '#22c55e',
      borderVisible: false,
      wickUpColor: '#ef4444', wickDownColor: '#22c55e',
    });
    candle.setData(ohlcv.map(d => ({ time: d.date as any, open: d.open, high: d.high, low: d.low, close: d.close })));

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

    const addLine = (data: (number | null)[], color: string, width: 1 | 2, style?: number, paneIndex = 0) => {
      const s = chart.addSeries(LineSeries, {
        color, lineWidth: width,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        lineStyle: style ?? LineStyle.Solid,
      }, paneIndex);
      s.setData(
        data.map((v, i) => v !== null ? { time: ohlcv[i].date as any, value: v } : null).filter(Boolean) as any
      );
      return s;
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

    // ── Pane 1: Volume ────────────────────────────────────────────────────────
    const volPane = chart.addPane();
    const vol = volPane.addSeries(HistogramSeries, { priceFormat: { type: 'volume' } });
    vol.setData(ohlcv.map(d => ({
      time: d.date as any,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)',
    })));
    volPane.setStretchFactor(showVolume ? PANE_HEIGHTS.volume : COLLAPSED_H);

    // ── Pane 2: RSI ───────────────────────────────────────────────────────────
    const rsiPane = chart.addPane();
    const rsiSeries = rsiPane.addSeries(LineSeries, {
      color: '#8b5cf6', lineWidth: 2,
      priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true,
    });
    rsiSeries.setData(
      indicators.rsi.map((v, i) => v !== null ? { time: ohlcv[i].date as any, value: v } : null).filter(Boolean) as any
    );
    rsiSeries.createPriceLine({ price: 70, color: '#ef4444', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '70' });
    rsiSeries.createPriceLine({ price: 30, color: '#22c55e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '30' });
    rsiPane.setStretchFactor(showRSI ? PANE_HEIGHTS.rsi : COLLAPSED_H);

    // ── Pane 3: KD ────────────────────────────────────────────────────────────
    const kdPane = chart.addPane();
    const rsvSeries = kdPane.addSeries(LineSeries, { color: '#64748b', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true });
    const kSeries = kdPane.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true });
    const dSeries = kdPane.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true });
    rsvSeries.setData(indicators.kdRsv.map((v, i) => !isNaN(v) ? { time: ohlcv[i].date as any, value: v } : null).filter(Boolean) as any);
    kSeries.setData(indicators.kdK.map((v, i) => !isNaN(v) ? { time: ohlcv[i].date as any, value: v } : null).filter(Boolean) as any);
    dSeries.setData(indicators.kdD.map((v, i) => !isNaN(v) ? { time: ohlcv[i].date as any, value: v } : null).filter(Boolean) as any);
    kSeries.createPriceLine({ price: 80, color: '#ef4444', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '80' });
    kSeries.createPriceLine({ price: 20, color: '#22c55e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '20' });
    kdPane.setStretchFactor(showKD ? PANE_HEIGHTS.kd : COLLAPSED_H);

    // ── Pane 4: MACD ──────────────────────────────────────────────────────────
    const macdPane = chart.addPane();
    const macdHist = macdPane.addSeries(HistogramSeries, {});
    macdHist.setData(
      indicators.macdHistogram.map((v, i) => v !== null
        ? { time: ohlcv[i].date as any, value: v, color: v >= 0 ? 'rgba(239,68,68,0.6)' : 'rgba(34,197,94,0.6)' }
        : null).filter(Boolean) as any
    );
    const macdLineSeries = macdPane.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true });
    const macdSignalSeries = macdPane.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true });
    macdLineSeries.setData(indicators.macdLine.map((v, i) => v !== null ? { time: ohlcv[i].date as any, value: v } : null).filter(Boolean) as any);
    macdSignalSeries.setData(indicators.macdSignal.map((v, i) => v !== null ? { time: ohlcv[i].date as any, value: v } : null).filter(Boolean) as any);
    macdLineSeries.createPriceLine({ price: 0, color: '#334155', lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: false, title: '' });
    macdPane.setStretchFactor(showMACD ? PANE_HEIGHTS.macd : COLLAPSED_H);

    // ── Pane 5: BIAS ──────────────────────────────────────────────────────────
    const biasPane = chart.addPane();
    const bias20Series = biasPane.addSeries(LineSeries, { color: '#60a5fa', lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true });
    const bias60Series = biasPane.addSeries(LineSeries, { color: '#a78bfa', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: true });
    bias20Series.setData(indicators.bias20.map((v, i) => v !== null ? { time: ohlcv[i].date as any, value: v } : null).filter(Boolean) as any);
    bias60Series.setData(indicators.bias60.map((v, i) => v !== null ? { time: ohlcv[i].date as any, value: v } : null).filter(Boolean) as any);
    bias20Series.createPriceLine({ price: 10, color: '#ef4444', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
    bias20Series.createPriceLine({ price: -10, color: '#22c55e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
    biasPane.setStretchFactor(showBias ? PANE_HEIGHTS.bias : COLLAPSED_H);

    chart.panes()[0].setStretchFactor(PANE_HEIGHTS.main);

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(entries => {
      if (entries[0]) chart.applyOptions({ width: entries[0].contentRect.width });
    });
    ro.observe(el);

    return () => { ro.disconnect(); chart.remove(); };
  }, [ohlcv, indicators, fibLevels, showFib, showMACDCross, showKDCross, showVolume, showRSI, showKD, showMACD, showBias]);

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-600 mb-1">
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
      <div className="space-y-1.5 text-xs text-slate-600 mb-2 border-t border-slate-800/60 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`font-medium w-20 flex-shrink-0 ${!showVolume && 'opacity-40'}`}>成交量</span>
          {showVolume && <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-500/50 inline-block" />成交量 ＋ 漲跌色</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`font-medium w-20 flex-shrink-0 ${!showRSI && 'opacity-40'}`}>RSI (14)</span>
          {showRSI && (<>
            <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-purple-500 inline-block" />RSI</span>
            <span className="text-red-400/70">┄ 70 超買</span>
            <span className="text-emerald-500/70">┄ 30 超賣</span>
          </>)}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`font-medium w-20 flex-shrink-0 ${!showKD && 'opacity-40'}`}>RSV + KD (9)</span>
          {showKD && (<>
            <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-slate-500 inline-block" />RSV</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-amber-400 inline-block" />K</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-blue-500 inline-block" />D</span>
            <span className="text-red-400/70">┄ 80 超買</span>
            <span className="text-emerald-500/70">┄ 20 超賣</span>
          </>)}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`font-medium w-28 flex-shrink-0 ${!showMACD && 'opacity-40'}`}>MACD (12,26,9)</span>
          {showMACD && (<>
            <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-blue-500 inline-block" />MACD</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-red-400 inline-block" />Signal</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/40 inline-block" />柱狀</span>
          </>)}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`font-medium w-20 flex-shrink-0 ${!showBias && 'opacity-40'}`}>乖離率 BIAS</span>
          {showBias && (<>
            <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-blue-400 inline-block" />BIAS(20)</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-purple-400 inline-block" />BIAS(60)</span>
            <span className="text-amber-500/70">⚠ ±10% 警戒</span>
          </>)}
        </div>
      </div>
      {hasPossibleSplit && (
        <div className="flex items-center gap-1.5 text-xs text-amber-500/70 mb-1">
          <span>⚠</span>
          <span>圖表偵測到可能未還原的受益單位分割，歷史價格僅供參考</span>
        </div>
      )}
      <div className="relative">
        <div ref={containerRef} />
        <div className="absolute inset-0 pointer-events-none z-20" style={{ left: 0 }}>
          {[
            { offset: offsetVolume, show: showVolume, toggle: () => setShowVolume(v => !v), label: '成交量' },
            { offset: offsetRSI, show: showRSI, toggle: () => setShowRSI(v => !v), label: 'RSI' },
            { offset: offsetKD, show: showKD, toggle: () => setShowKD(v => !v), label: 'RSV+KD' },
            { offset: offsetMACD, show: showMACD, toggle: () => setShowMACD(v => !v), label: 'MACD' },
            { offset: offsetBias, show: showBias, toggle: () => setShowBias(v => !v), label: '乖離率' },
          ].map(p => (
            <button
              key={p.label}
              type="button"
              onClick={p.toggle}
              title={`${p.label}（${p.show ? '點擊收合' : '點擊展開'}）`}
              style={{ top: p.offset + 3, left: 3 }}
              className={`absolute pointer-events-auto w-5 h-5 flex items-center justify-center rounded border text-[10px] shadow-sm transition-all ${
                p.show
                  ? 'bg-[#0c1628] border-slate-600/70 text-slate-300 hover:border-blue-500/60 hover:text-blue-300'
                  : 'bg-[#0c1628] border-slate-700/50 text-slate-600 hover:border-blue-500/50 hover:text-blue-400'
              }`}
            >
              <span className={`inline-block transition-transform ${p.show ? '' : '-rotate-90'}`}>▾</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
