import { useState } from 'react';
import type { FundamentalCheck } from '../types/stock';

interface Props {
  checks: FundamentalCheck[];
  loading: boolean;
}

const passStyle = {
  true:  'bg-emerald-950/50 border-emerald-800/40',
  false: 'bg-red-950/50 border-red-800/40',
  null:  'bg-slate-800/50 border-slate-700/40',
};
const badgeStyle = {
  true:  'bg-emerald-900/60 text-emerald-300',
  false: 'bg-red-900/60 text-red-300',
  null:  'bg-slate-700/60 text-slate-400',
};
const passIcon = { true: '✅', false: '❌', null: '—' };

export function FundamentalPanel({ checks, loading }: Props) {
  const [open, setOpen] = useState(true);

  if (loading) {
    return (
      <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="text-sm text-slate-600 animate-pulse">載入基本面資料中…</div>
      </div>
    );
  }

  if (checks.length === 0) {
    return (
      <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <h3 className="font-semibold text-slate-200 mb-2">基本面篩選</h3>
        <p className="text-xs text-slate-600">此股票基本面資料暫時無法取得（Yahoo Finance 未收錄或資料不足）</p>
      </div>
    );
  }

  const passCount = checks.filter(c => c.pass === true).length;
  const totalChecked = checks.filter(c => c.pass !== null).length;
  const scoreColor = passCount >= 4 ? 'text-emerald-400' : passCount >= 3 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setOpen(v => !v)}>
        <h3 className="font-semibold text-slate-200">基本面篩選</h3>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${scoreColor}`}>{passCount} / {totalChecked} 通過</span>
          <span className={`text-slate-500 text-sm transition-transform duration-200 ${open ? '' : '-rotate-90'}`}>▾</span>
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          {checks.map(c => (
            <div key={c.id} className={`rounded-lg border p-3 ${passStyle[String(c.pass) as keyof typeof passStyle]}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-400">{c.name}</span>
                <span className="text-base">{passIcon[String(c.pass) as keyof typeof passIcon]}</span>
              </div>
              <div className="text-xs text-slate-500 mb-1">{c.description}</div>
              <div className={`text-xs font-semibold px-1.5 py-0.5 rounded inline-block ${badgeStyle[String(c.pass) as keyof typeof badgeStyle]}`}>
                {c.value}
              </div>
              <div className="text-xs text-slate-600 mt-1">門檻 {c.threshold}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
