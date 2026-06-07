import { useState } from 'react';
import type { Recommendation } from '../utils/recommendation';
import type { CompanyInsight } from '../services/geminiAnalysis';

function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/(\d[\d,]*(?:\.\d+)?)/g);
  return (
    <>
      {parts.map((part, i) => {
        const num = parseFloat(part.replace(/,/g, ''));
        if (i % 2 === 1 && !isNaN(num) && num >= 1000) {
          return <strong key={i} className="text-amber-300 font-bold">{part}</strong>;
        }
        return part;
      })}
    </>
  );
}

export interface InsightParams {
  forwardEps?: number | null;
  peLow?: number | null;
  peHigh?: number | null;
}

interface Props {
  rec: Recommendation;
  stockName: string;
  insight?: CompanyInsight | null;
  insightLoading?: boolean;
  insightFailed?: boolean;
  autoInsight?: boolean;
  onRetryInsight?: (params?: InsightParams) => void;
  onToggleAutoInsight?: () => void;
}

const METER_COLORS: Record<string, string> = {
  'strong-buy': 'bg-red-500',
  'buy':        'bg-orange-400',
  'watch':      'bg-amber-400',
  'weak':       'bg-blue-400',
  'sell':       'bg-emerald-500',
};

const VALUATION_STYLE: Record<string, { border: string; text: string; bg: string }> = {
  '低估':    { border: 'border-blue-500/40',    text: 'text-blue-300',    bg: 'bg-blue-500/10' },
  '合理偏低': { border: 'border-emerald-500/40', text: 'text-emerald-300', bg: 'bg-emerald-500/10' },
  '合理':    { border: 'border-slate-500/40',   text: 'text-slate-300',   bg: 'bg-slate-500/10' },
  '合理偏高': { border: 'border-amber-500/40',   text: 'text-amber-300',   bg: 'bg-amber-500/10' },
  '高估':    { border: 'border-red-500/40',     text: 'text-red-300',     bg: 'bg-red-500/10' },
};

export function RecommendationPanel({ rec, stockName, insight, insightLoading, insightFailed, autoInsight, onRetryInsight, onToggleAutoInsight }: Props) {
  const [open, setOpen] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [fwdEps, setFwdEps] = useState('');
  const [peLow, setPeLow] = useState('');
  const [peHigh, setPeHigh] = useState('');

  const INPUT = 'w-20 border border-slate-700 bg-slate-800/70 text-slate-200 rounded px-2 py-0.5 text-center text-xs focus:outline-none focus:border-purple-600';

  function buildParams(): InsightParams | undefined {
    const fe = fwdEps !== '' ? Number(fwdEps) : null;
    const pl = peLow !== '' ? Number(peLow) : null;
    const ph = peHigh !== '' ? Number(peHigh) : null;
    if (fe == null && pl == null && ph == null) return undefined;
    return { forwardEps: fe, peLow: pl, peHigh: ph };
  }

  function CustomFields() {
    return (
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
          <span>預估 EPS</span>
          <input type="number" value={fwdEps} placeholder="留空" onChange={e => setFwdEps(e.target.value)} className={INPUT} />
          <span>元</span>
          <span className="ml-2">合理 P/E</span>
          <input type="number" value={peLow} placeholder="下限" onChange={e => setPeLow(e.target.value)} className={INPUT} />
          <span>～</span>
          <input type="number" value={peHigh} placeholder="上限" onChange={e => setPeHigh(e.target.value)} className={INPUT} />
          <span>倍</span>
        </div>
        <p className="text-[10px] text-slate-700">留空由 AI 自行判斷；填入後 AI 將優先採用你的數字計算合理價</p>
      </div>
    );
  }

  const vs = insight ? (VALUATION_STYLE[insight.valuationLabel] ?? VALUATION_STYLE['合理']) : null;

  return (
    <div className={`rounded-xl border ${rec.bgColor} ${rec.borderColor} p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]`}>
      <div className="flex items-center justify-between cursor-pointer select-none mb-4" onClick={() => setOpen(v => !v)}>
        <div>
          <div className="text-xs text-slate-500 mb-0.5">綜合建議 — {stockName}</div>
          <div className={`text-2xl font-bold ${rec.color}`}>{rec.label}</div>
        </div>
        <div className="flex items-end gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-500 mb-1">綜合評分</div>
            <div className={`text-4xl font-bold tabular-nums ${rec.color}`}>{rec.score}</div>
            <div className="text-xs text-slate-600">/ 100</div>
          </div>
          <span className={`text-slate-500 text-sm transition-transform duration-200 mb-1 ${open ? '' : '-rotate-90'}`}>▾</span>
        </div>
      </div>

      {open && (
        <>
          <div className="space-y-2 mb-4">
            {[
              { label: '技術面', value: rec.techScore },
              { label: '基本面', value: rec.fundScore },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-12">{label}</span>
                <div className="flex-1 h-2 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${METER_COLORS[rec.rating]}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-400 w-8 text-right">{value}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {rec.reasons.length > 0 && (
              <div>
                <div className="text-xs font-medium text-slate-400 mb-1.5">✅ 支持買入的理由</div>
                <ul className="space-y-1">
                  {rec.reasons.map((r, i) => (
                    <li key={i} className="text-xs text-slate-300 flex gap-1.5">
                      <span className="text-emerald-500 flex-shrink-0">•</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {rec.cautions.length > 0 && (
              <div>
                <div className="text-xs font-medium text-slate-400 mb-1.5">⚠️ 需注意的風險</div>
                <ul className="space-y-1">
                  {rec.cautions.map((c, i) => (
                    <li key={i} className="text-xs text-slate-300 flex gap-1.5">
                      <span className="text-amber-500 flex-shrink-0">•</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* AI 投資洞察 */}
          {/* initial state — not yet requested */}
          {!insightLoading && !insight && !insightFailed && onRetryInsight && (
            <div className="border-t border-white/10 pt-4 mb-4 space-y-2">
              <button
                onClick={() => onRetryInsight(buildParams())}
                className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors border border-purple-900/40 hover:border-purple-700/60 rounded-lg px-4 py-2.5 bg-purple-950/20 hover:bg-purple-950/40 w-full justify-center"
              >
                <span className="text-purple-500">✦</span>
                產生 AI 投資洞察（公司優勢 · 多空論點 · 估值邏輯）
              </button>
              <button
                onClick={() => setShowCustom(v => !v)}
                className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1"
              >
                {showCustom ? '▾ 自訂估值假設' : '▸ 自訂估值假設（自訂 EPS / P/E）'}
              </button>
              {showCustom && <CustomFields />}
              {onToggleAutoInsight && (
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[11px] text-slate-600">切換股票自動分析</span>
                  <button
                    onClick={onToggleAutoInsight}
                    className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all font-medium ${
                      autoInsight
                        ? 'border-purple-700/50 bg-purple-900/30 text-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.2)]'
                        : 'border-slate-700/40 bg-slate-800/30 text-slate-600 hover:text-slate-400 hover:border-slate-600/50'
                    }`}
                  >
                    {autoInsight ? '● 自動 ON' : '○ 自動 OFF'}
                  </button>
                </div>
              )}
            </div>
          )}
          {/* failed */}
          {!insightLoading && !insight && insightFailed && (
            <div className="border-t border-white/10 pt-4 mb-4 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-purple-400 tracking-wide">✦ AI 投資洞察</span>
                <span className="text-xs text-slate-600">暫時無法取得（API 限流）</span>
                {onRetryInsight && (
                  <button
                    onClick={() => onRetryInsight(buildParams())}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors border border-purple-900/40 rounded px-2 py-0.5 ml-auto"
                  >
                    ↺ 重試
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowCustom(v => !v)}
                className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1"
              >
                {showCustom ? '▾ 自訂估值假設' : '▸ 自訂估值假設（自訂 EPS / P/E）'}
              </button>
              {showCustom && <CustomFields />}
            </div>
          )}
          {insightLoading && (
            <div className="border-t border-white/10 pt-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-purple-400 tracking-wide">✦ AI 投資洞察</span>
                <span className="text-xs text-slate-600 animate-pulse">分析中…</span>
              </div>
              <div className="space-y-2">
                {[80, 60, 90, 70].map((w, i) => (
                  <div key={i} className="h-3 rounded bg-white/5 animate-pulse" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          )}

          {insight && vs && (
            <div className="border-t border-white/10 pt-4 mb-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-purple-400 tracking-wide">✦ AI 投資洞察</span>
                {onToggleAutoInsight && (
                  <button
                    onClick={onToggleAutoInsight}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ml-1 ${
                      autoInsight
                        ? 'border-purple-700/50 bg-purple-900/30 text-purple-400'
                        : 'border-slate-700/40 text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    {autoInsight ? '● 自動' : '○ 手動'}
                  </button>
                )}
                <span className="text-[10px] text-slate-600 ml-auto">AI 生成 · 僅供參考</span>
              </div>

              {/* Intro + valuation — always visible */}
              <p className="text-sm text-slate-300 leading-relaxed italic">{insight.intro}</p>
              <div className={`rounded-lg px-4 py-3 border ${vs.border} ${vs.bg}`}>
                <span className={`text-xs font-semibold ${vs.text}`}>{insight.valuationLabel}邏輯　</span>
                <span className={`text-xs leading-relaxed ${vs.text} opacity-90`}>{insight.valuationContent}</span>
              </div>

              {/* 操作建議 */}
              {insight.tradingAdvice && (
                <div className="bg-black/30 rounded-lg border border-slate-700/40 px-4 py-3 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-300">操作建議</div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <HighlightedText text={insight.tradingAdvice.summary} />
                  </p>
                  <ul className="space-y-2">
                    <li className="text-xs text-slate-300 leading-relaxed">
                      <span className="font-semibold text-slate-200">如果您已持有：</span>
                      <HighlightedText text={insight.tradingAdvice.ifHolding} />
                    </li>
                    <li className="text-xs text-slate-300 leading-relaxed">
                      <span className="font-semibold text-slate-200">如果您想進場：</span>
                      <HighlightedText text={insight.tradingAdvice.ifEntering} />
                    </li>
                  </ul>
                  <p className="text-[10px] text-slate-700">註：股市投資具風險，上述分析僅供參考，不代表買賣建議。</p>
                </div>
              )}

              {/* Bulls & Bears — behind show more */}
              {showMore && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-black/20 rounded-lg px-4 py-3 border border-emerald-900/40">
                    <div className="text-xs font-semibold text-emerald-400 mb-2">多頭論點</div>
                    <ul className="space-y-1.5">
                      {insight.bulls.map((b, i) => (
                        <li key={i} className="text-xs text-slate-300 flex gap-1.5 leading-relaxed">
                          <span className="text-emerald-500 flex-shrink-0 mt-0.5">▲</span>{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-black/20 rounded-lg px-4 py-3 border border-red-900/40">
                    <div className="text-xs font-semibold text-red-400 mb-2">空頭風險（如果判斷錯了）</div>
                    <ul className="space-y-1.5">
                      {insight.bears.map((b, i) => (
                        <li key={i} className="text-xs text-slate-300 flex gap-1.5 leading-relaxed">
                          <span className="text-red-500 flex-shrink-0 mt-0.5">▼</span>{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setShowMore(v => !v)}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                >
                  {showMore ? '收起 ▲' : '顯示多頭 / 空頭分析 ▾'}
                </button>
                {onRetryInsight && (
                  <button
                    onClick={() => setShowCustom(v => !v)}
                    className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors ml-auto"
                  >
                    {showCustom ? '▾ 自訂假設' : '▸ 以自訂假設重新分析'}
                  </button>
                )}
              </div>
              {showCustom && onRetryInsight && (
                <div className="space-y-2">
                  <CustomFields />
                  <button
                    onClick={() => onRetryInsight(buildParams())}
                    className="text-xs text-purple-400 hover:text-purple-300 border border-purple-900/40 rounded px-3 py-1 hover:bg-purple-950/30 transition-colors"
                  >
                    ↺ 重新生成
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-white/10 pt-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              ⚠️ <span className="font-medium text-slate-500">免責聲明：</span>
              本建議由技術指標與基本面數據自動演算，僅供個人學習參考，<strong className="text-slate-500">不構成任何投資建議或買賣依據</strong>。
              股票投資有風險，市場受多重因素影響，過去績效不代表未來表現。請依個人風險承受能力自行判斷，投資前建議諮詢合格理財顧問。
            </p>
          </div>
        </>
      )}
    </div>
  );
}
