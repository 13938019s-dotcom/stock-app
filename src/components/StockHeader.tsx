import type { StockInfo } from '../types/stock';
import { getTWName } from '../utils/stockNames';

interface Props {
  info: StockInfo;
  high52?: number;
  low52?: number;
}

export function StockHeader({ info, high52, low52 }: Props) {
  const isUp = info.change >= 0;
  const color = isUp ? 'text-red-400' : 'text-emerald-400';
  const bgBadge = isUp ? 'bg-red-950/60 border-red-800/40' : 'bg-emerald-950/60 border-emerald-800/40';
  const sign = isUp ? '▲' : '▼';

  const show52 = high52 != null && low52 != null && high52 > low52;
  const pct52 = show52 ? Math.max(0, Math.min(100, ((info.currentPrice - low52!) / (high52! - low52!)) * 100)) : 0;
  const fromHigh = show52 ? ((info.currentPrice - high52!) / high52!) * 100 : 0;

  const chineseName = getTWName(info.symbol);
  const displayName = chineseName ?? info.name;
  const subName = chineseName && info.name !== chineseName ? info.name : null;

  return (
    <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 px-6 py-4 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="text-2xl font-bold text-white">{displayName}</h2>
          <span className="text-sm text-slate-500 font-mono">{info.symbol.replace(/\.TWO?$/i, '')}</span>
          {subName && <span className="text-sm text-slate-500">{subName}</span>}
          {info.industry && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-800/30 text-blue-400 font-medium">
              {info.industry}
            </span>
          )}
        </div>
        {info.dividendYield != null && (
          <div className="text-xs text-slate-500 mt-0.5">
            殖利率 {(info.dividendYield * 100).toFixed(2)}%
          </div>
        )}
        {show52 && (
          <div className="flex items-center gap-2 mt-2 min-w-0">
            <span className="text-[11px] text-slate-600 whitespace-nowrap tabular-nums">{low52!.toLocaleString('zh-TW', { maximumFractionDigits: 1 })}</span>
            <div className="relative flex-1 h-1.5 bg-slate-700/60 rounded-full min-w-[80px]">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-600 via-blue-500 to-red-500 opacity-40"
                style={{ width: '100%' }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.6)] border-2 border-slate-400 z-10"
                style={{ left: `calc(${pct52}% - 5px)` }}
              />
            </div>
            <span className="text-[11px] text-slate-600 whitespace-nowrap tabular-nums">{high52!.toLocaleString('zh-TW', { maximumFractionDigits: 1 })}</span>
            <span className={`text-[11px] font-medium whitespace-nowrap tabular-nums ${fromHigh < -20 ? 'text-emerald-400' : fromHigh < -5 ? 'text-slate-400' : 'text-amber-400'}`}>
              {fromHigh >= 0 ? '52W高' : `距高 ${fromHigh.toFixed(1)}%`}
            </span>
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="text-xs text-slate-500 mb-0.5">目前股價</div>
        <div className="text-3xl font-bold text-white tabular-nums">
          {info.currentPrice.toLocaleString('zh-TW', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
        </div>
        <div className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full border text-sm font-semibold tabular-nums ${color} ${bgBadge}`}>
          {sign} {Math.abs(info.change).toFixed(2)} ({sign} {Math.abs(info.changePercent).toFixed(2)}%)
        </div>
      </div>
    </div>
  );
}
