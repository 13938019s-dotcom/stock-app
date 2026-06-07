import { useState, useEffect } from 'react';
import { fetchQuote } from '../services/yahooFinance';

interface IndexDef {
  symbol: string;
  label: string;
  flag: string;
  isVix?: boolean;
}

const INDICES: IndexDef[] = [
  { symbol: '^TWII',  label: '台灣加權',   flag: '🇹🇼' },
  { symbol: '^SOX',   label: '費城半導體', flag: '💡' },
  { symbol: '^GSPC',  label: 'S&P 500',   flag: '🇺🇸' },
  { symbol: '^IXIC',  label: 'NASDAQ',    flag: '🇺🇸' },
  { symbol: '^DJI',   label: '道瓊',      flag: '🏦' },
  { symbol: '^N225',  label: '日經 225',  flag: '🇯🇵' },
  { symbol: '^HSI',   label: '恆生指數',  flag: '🇭🇰' },
  { symbol: '^VIX',   label: '恐慌 VIX',  flag: '😱', isVix: true },
];

type QuoteState = { price: number; changePercent: number } | 'loading' | null;

function fmtPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return price.toFixed(2);
}

function getVixLevel(price: number): { label: string; cls: string; borderBg: string } {
  if (price >= 30) return { label: '極度恐慌', cls: 'text-red-400',     borderBg: 'border-red-700/50 bg-red-950/25 hover:border-red-600/60' };
  if (price >= 20) return { label: '市場警戒', cls: 'text-amber-400',   borderBg: 'border-amber-700/50 bg-amber-950/25 hover:border-amber-600/60' };
  return               { label: '情緒平穩',   cls: 'text-emerald-400', borderBg: 'border-emerald-700/50 bg-emerald-950/25 hover:border-emerald-600/60' };
}

interface Props {
  activeSymbol?: string;
  onSelect: (symbol: string) => void;
}

export function IndexBar({ activeSymbol, onSelect }: Props) {
  const [quotes, setQuotes] = useState<Record<string, QuoteState>>(
    Object.fromEntries(INDICES.map(i => [i.symbol, 'loading']))
  );

  useEffect(() => {
    let cancelled = false;
    INDICES.forEach(async ({ symbol }) => {
      const q = await fetchQuote(symbol);
      if (cancelled) return;
      setQuotes(prev => ({ ...prev, [symbol]: q }));
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200">🌍 全球主要指數</h3>
        <span className="text-[11px] text-slate-600">點擊切換圖表</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-2">
        {INDICES.map(idx => {
          const q = quotes[idx.symbol];
          const isLoading = q === 'loading';
          const isNull = q === null;
          const data = (!isLoading && !isNull) ? q as { price: number; changePercent: number } : null;
          const up = data ? data.changePercent >= 0 : null;
          const isActive = activeSymbol === idx.symbol;
          const vix = (idx.isVix && data) ? getVixLevel(data.price) : null;

          // VIX rising = bad (market fear up) → show red; VIX falling = calming → green
          const changeColor = idx.isVix
            ? (up ? 'text-red-400' : 'text-emerald-400')
            : (up ? 'text-emerald-400' : 'text-red-400');

          const cardCls = isActive
            ? 'border-blue-500/50 bg-blue-950/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
            : vix
            ? vix.borderBg
            : up === true
            ? 'border-emerald-800/30 bg-emerald-950/15 hover:border-emerald-700/50 hover:bg-emerald-950/30'
            : up === false
            ? 'border-red-800/30 bg-red-950/15 hover:border-red-700/50 hover:bg-red-950/30'
            : 'border-slate-700/30 bg-slate-800/20 hover:border-slate-600/50';

          return (
            <button
              key={idx.symbol}
              onClick={() => onSelect(idx.symbol)}
              className={`rounded-lg border px-3 py-2.5 text-left transition-all ${cardCls}`}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[11px]">{idx.flag}</span>
                <span className="text-[11px] text-slate-500 truncate">{idx.label}</span>
                {isActive && <span className="text-[9px] text-blue-400 ml-auto">▶</span>}
              </div>

              {isLoading && (
                <div className="space-y-1.5">
                  <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
                  <div className="h-2.5 w-12 bg-slate-800/60 rounded animate-pulse" />
                </div>
              )}
              {isNull && <div className="text-xs text-slate-700">無資料</div>}
              {data && (
                <>
                  <div className="text-sm font-semibold font-mono text-slate-200 tabular-nums leading-tight">
                    {fmtPrice(data.price)}
                  </div>
                  {vix ? (
                    <div>
                      <div className={`text-[11px] font-medium mt-0.5 ${vix.cls}`}>{vix.label}</div>
                      <div className={`text-[10px] tabular-nums mt-0.5 ${changeColor}`}>
                        {up ? '▲' : '▼'} {Math.abs(data.changePercent).toFixed(2)}%
                      </div>
                    </div>
                  ) : (
                    <div className={`text-[11px] font-medium tabular-nums mt-0.5 ${changeColor}`}>
                      {up ? '▲' : '▼'} {Math.abs(data.changePercent).toFixed(2)}%
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
