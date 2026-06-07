import { useState } from 'react';
import type { CompanyInsight } from '../services/geminiAnalysis';

interface Props {
  insight: CompanyInsight;
  loading: boolean;
}

const VALUATION_STYLE: Record<string, { border: string; text: string; bg: string }> = {
  '低估':    { border: 'border-blue-500/40',    text: 'text-blue-300',    bg: 'bg-blue-500/10' },
  '合理偏低': { border: 'border-emerald-500/40', text: 'text-emerald-300', bg: 'bg-emerald-500/10' },
  '合理':    { border: 'border-slate-500/40',   text: 'text-slate-300',   bg: 'bg-slate-500/10' },
  '合理偏高': { border: 'border-amber-500/40',   text: 'text-amber-300',   bg: 'bg-amber-500/10' },
  '高估':    { border: 'border-red-500/40',     text: 'text-red-300',     bg: 'bg-red-500/10' },
};

export function CompanyInsightPanel({ insight, loading }: Props) {
  const [open, setOpen] = useState(true);
  const [showMore, setShowMore] = useState(false);

  if (loading) {
    return (
      <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-purple-400 tracking-wide">✦ AI 投資洞察</span>
          <span className="text-xs text-slate-600 animate-pulse">分析中…</span>
        </div>
        <div className="space-y-2">
          {[80, 60, 90, 70].map((w, i) => (
            <div key={i} className="h-3 rounded bg-slate-800 animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const vs = VALUATION_STYLE[insight.valuationLabel] ?? VALUATION_STYLE['合理'];

  return (
    <div className="bg-[#0c1628] rounded-xl border border-purple-900/30 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setOpen(v => !v)}>
        <span className="text-xs font-semibold text-purple-400 tracking-wide">✦ AI 投資洞察</span>
        <span className="text-[10px] text-slate-600 ml-auto">Gemini 生成 · 僅供參考</span>
        <span className={`text-slate-500 text-sm transition-transform duration-200 ml-1 ${open ? '' : '-rotate-90'}`}>▾</span>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-300 leading-relaxed italic">{insight.intro}</p>
          <div className={`rounded-lg px-4 py-3 border ${vs.border} ${vs.bg}`}>
            <span className={`text-xs font-semibold ${vs.text}`}>{insight.valuationLabel}邏輯　</span>
            <span className={`text-xs leading-relaxed ${vs.text} opacity-90`}>{insight.valuationContent}</span>
          </div>
          {showMore && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-emerald-900/40">
                <div className="text-xs font-semibold text-emerald-400 mb-2">多頭論點</div>
                <ul className="space-y-1.5">
                  {insight.bulls.map((b, i) => (
                    <li key={i} className="text-xs text-slate-300 flex gap-1.5 leading-relaxed">
                      <span className="text-emerald-500 flex-shrink-0 mt-0.5">▲</span>{b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-red-900/40">
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
          <button
            onClick={() => setShowMore(v => !v)}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            {showMore ? '收起 ▲' : '顯示多頭 / 空頭分析 ▾'}
          </button>
        </div>
      )}
    </div>
  );
}
