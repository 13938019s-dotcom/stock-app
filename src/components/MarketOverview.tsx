import { useState } from 'react';
import type { OHLCV, Indicators, EconomicLight } from '../types/stock';
import { calcFibonacci } from '../utils/indicators';
import { MainChart } from './MainChart';

interface Props {
  ohlcv: OHLCV[];
  indicators: Indicators;
  loading: boolean;
}

const LIGHT_CONFIG: Record<string, { bg: string; dot: string; label: string }> = {
  red:          { bg: 'bg-red-950/50 border-red-800/40',         dot: 'bg-red-500',    label: '紅燈 (景氣過熱)' },
  'yellow-red': { bg: 'bg-orange-950/50 border-orange-800/40',   dot: 'bg-orange-400', label: '黃紅燈 (景氣活絡)' },
  green:        { bg: 'bg-emerald-950/50 border-emerald-800/40', dot: 'bg-emerald-500',label: '綠燈 (景氣穩定)' },
  'yellow-blue':{ bg: 'bg-yellow-950/50 border-yellow-800/40',   dot: 'bg-yellow-400', label: '黃藍燈 (景氣趨緩)' },
  blue:         { bg: 'bg-blue-950/50 border-blue-800/40',       dot: 'bg-blue-500',   label: '藍燈 (景氣衰退)' },
};

const STATIC_LIGHTS: EconomicLight[] = [
  { date: '2026-04', score: 39, light: 'red',          lightLabel: '紅燈' },
  { date: '2026-03', score: 39, light: 'red',          lightLabel: '紅燈' },
  { date: '2026-02', score: 41, light: 'red',          lightLabel: '紅燈' },
  { date: '2026-01', score: 39, light: 'red',          lightLabel: '紅燈' },
  { date: '2025-12', score: 38, light: 'red',          lightLabel: '紅燈' },
  { date: '2025-11', score: 37, light: 'yellow-red',   lightLabel: '黃紅燈' },
  { date: '2025-10', score: 35, light: 'yellow-red',   lightLabel: '黃紅燈' },
  { date: '2025-09', score: 34, light: 'yellow-red',   lightLabel: '黃紅燈' },
  { date: '2025-08', score: 31, light: 'green',        lightLabel: '綠燈' },
  { date: '2025-07', score: 29, light: 'green',        lightLabel: '綠燈' },
  { date: '2025-06', score: 29, light: 'green',        lightLabel: '綠燈' },
  { date: '2025-05', score: 31, light: 'green',        lightLabel: '綠燈' },
  { date: '2025-04', score: 33, light: 'yellow-red',   lightLabel: '黃紅燈' },
  { date: '2025-03', score: 33, light: 'yellow-red',   lightLabel: '黃紅燈' },
];

const CARD = 'bg-[#0c1628] rounded-xl border border-slate-700/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]';

export function MarketOverview({ ohlcv, indicators, loading }: Props) {
  const [showFib, setShowFib] = useState(false);
  const lights = STATIC_LIGHTS;

  if (loading || ohlcv.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
        {loading ? '載入大盤資料中…' : '請搜尋 ^TWII 查看大盤'}
      </div>
    );
  }

  const { levels: fibLevels, swingHigh, swingLow } = calcFibonacci(ohlcv);
  const currentPrice = ohlcv[ohlcv.length - 1].close;
  const pct52 = Math.max(0, Math.min(100, ((currentPrice - swingLow) / (swingHigh - swingLow)) * 100));
  const fromHigh52 = ((currentPrice - swingHigh) / swingHigh) * 100;
  const latestLight = lights[0];
  const lightCfg = LIGHT_CONFIG[latestLight.light];

  const last = ohlcv.length - 1;
  const bias20 = indicators.bias20[last];
  const bias60 = indicators.bias60[last];

  return (
    <div className="space-y-4">
      {/* 景氣燈號 */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-200">🚦 景氣燈號</h3>
          <span className="text-xs text-slate-600">
            最新 {lights[0].date} ｜ 每月約26日發布，有新資料請告知 Claude 更新
          </span>
        </div>
        <div className="flex flex-wrap gap-3 mb-3">
          {lights.slice(0, 6).map((l, i) => {
            const cfg = LIGHT_CONFIG[l.light];
            return (
              <div key={l.date} className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${cfg.bg} ${i === 0 ? 'ring-1 ring-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.15)]' : ''}`}>
                <div className={`w-4 h-4 rounded-full ${cfg.dot} shadow-[0_0_6px_currentColor]`} />
                <div>
                  <div className="text-xs font-medium text-slate-300">{l.date}</div>
                  <div className="text-xs text-slate-500">{cfg.label}</div>
                  <div className="text-xs font-mono text-slate-600">分數 {l.score}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className={`rounded-lg border p-3 ${lightCfg.bg} flex items-center gap-3`}>
          <div className={`w-5 h-5 rounded-full ${lightCfg.dot} flex-shrink-0`} />
          <div className="text-sm">
            <span className="font-semibold text-slate-200">最新：{latestLight.date} — {lightCfg.label}</span>
            <span className="text-slate-500 ml-2 text-xs">景氣綜合判斷分數 {latestLight.score}</span>
          </div>
        </div>
      </div>

      {/* Fibonacci & BIAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={CARD}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-200">📐 費波那契回撤</h3>
            <button
              onClick={() => setShowFib(v => !v)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                showFib
                  ? 'bg-gradient-to-b from-amber-600/80 to-amber-800/80 border-amber-500/30 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                  : 'bg-gradient-to-b from-slate-600/50 to-slate-800/50 border-slate-600/30 text-slate-400 hover:text-slate-200'
              }`}
            >
              {showFib ? '✓ 已顯示在圖表' : '顯示在圖表'}
            </button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-slate-700 tabular-nums whitespace-nowrap">{swingLow.toFixed(0)}</span>
            <div className="relative flex-1 h-2 bg-slate-700/60 rounded-full min-w-[60px]">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-600/50 via-blue-500/40 to-red-500/50" />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow border-2 border-slate-400 z-10"
                style={{ left: `calc(${pct52}% - 6px)` }}
              />
            </div>
            <span className="text-[10px] text-slate-700 tabular-nums whitespace-nowrap">{swingHigh.toFixed(0)}</span>
            <span className={`text-[10px] font-medium whitespace-nowrap tabular-nums ${fromHigh52 < -20 ? 'text-emerald-400' : fromHigh52 < -5 ? 'text-slate-400' : 'text-amber-400'}`}>
              {fromHigh52 >= 0 ? '52W高' : `距高 ${fromHigh52.toFixed(1)}%`}
            </span>
          </div>
          <div className="space-y-1.5">
            {fibLevels.map(f => {
              const isCurrent = Math.abs(currentPrice - f.price) / f.price < 0.02;
              const isSupport = currentPrice < f.price;
              return (
                <div key={f.ratio} className={`flex items-center gap-2 text-sm rounded px-2 py-1 ${isCurrent ? 'bg-amber-950/50 ring-1 ring-amber-700/30' : ''}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    f.ratio === 0.618 ? 'bg-emerald-500' :
                    f.ratio === 0.5   ? 'bg-red-400' :
                    f.ratio === 0.382 ? 'bg-amber-400' : 'bg-slate-600'
                  }`} />
                  <span className="text-slate-500 w-20 font-mono">{f.label}</span>
                  <span className={`font-mono font-medium tabular-nums ${isSupport ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {f.price.toFixed(1)}
                  </span>
                  {isCurrent && <span className="text-xs text-amber-400">← 現價附近</span>}
                  {f.ratio === 0.618 && !isCurrent && <span className="text-xs text-emerald-500">黃金回撤</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-slate-600 bg-slate-800/40 rounded p-2 border border-slate-700/30">
            💡 現價 <span className="font-mono text-slate-400">{currentPrice.toFixed(1)}</span>，
            {(() => {
              const nearLevel = fibLevels.find(f => Math.abs(currentPrice - f.price) / f.price < 0.03);
              if (nearLevel) return `位於 ${nearLevel.label} 附近，是回撤狙擊區`;
              const below = fibLevels.find(f => f.price <= currentPrice);
              return below ? `最近支撐在 ${below.label} (${below.price.toFixed(1)})` : '位於所有支撐位上方';
            })()}
          </div>
        </div>

        <div className={CARD}>
          <h3 className="font-semibold text-slate-200 mb-3">🌡️ 乖離率過熱預警</h3>
          <div className="space-y-3">
            {[
              { label: 'MA20 乖離率', value: bias20, hot: 10, cold: -10 },
              { label: 'MA60 乖離率', value: bias60, hot: 15, cold: -15 },
            ].map(({ label, value, hot, cold }) => {
              const status = value === null ? null : value > hot ? 'hot' : value < cold ? 'cold' : 'normal';
              return (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">{label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden relative">
                      {value !== null && (
                        <div
                          className={`absolute top-0 h-full rounded-full ${value >= 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{
                            width: `${Math.min(Math.abs(value) / Math.abs(hot) * 50, 50)}%`,
                            left: value >= 0 ? '50%' : `${50 - Math.min(Math.abs(value) / Math.abs(cold) * 50, 50)}%`,
                          }}
                        />
                      )}
                    </div>
                    <span className={`text-sm font-mono font-semibold w-16 text-right tabular-nums ${
                      status === 'hot' ? 'text-red-400' : status === 'cold' ? 'text-emerald-400' : 'text-slate-300'
                    }`}>
                      {value !== null ? `${value >= 0 ? '+' : ''}${value.toFixed(1)}%` : '—'}
                    </span>
                    {status === 'hot'  && <span className="text-xs text-red-400 font-medium">過熱⚠</span>}
                    {status === 'cold' && <span className="text-xs text-emerald-400 font-medium">超跌↓</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-slate-600 bg-slate-800/40 rounded p-2 border border-slate-700/30">
            💡 MA20 乖離超 ±10%、MA60 超 ±15% 為過熱/過冷警戒，常為短線回歸訊號
          </div>
        </div>
      </div>

      <div className={CARD}>
        <h3 className="font-semibold text-slate-300 text-sm mb-3">K 線 ＋ 均線 ＋ 布林通道</h3>
        <MainChart ohlcv={ohlcv} indicators={indicators} fibLevels={fibLevels} showFib={showFib} />
      </div>
    </div>
  );
}
