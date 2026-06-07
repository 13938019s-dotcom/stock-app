import { useState } from 'react';
import type { TechnicalSignal } from '../types/stock';
import { TechExplainModal } from './TechExplainModal';

interface Props {
  signals: TechnicalSignal[];
}

const typeStyles = {
  buy:     { card: 'bg-red-950/50 border-red-800/40',    badge: 'bg-red-900/60 text-red-300',    text: 'text-red-300' },
  watch:   { card: 'bg-blue-950/50 border-blue-800/40',  badge: 'bg-blue-900/60 text-blue-300',  text: 'text-blue-300' },
  warning: { card: 'bg-amber-950/50 border-amber-800/40',badge: 'bg-amber-900/60 text-amber-300',text: 'text-amber-300' },
  neutral: { card: 'bg-slate-800/50 border-slate-700/40',badge: 'bg-slate-700/60 text-slate-400',text: 'text-slate-400' },
};

export function SignalPanel({ signals }: Props) {
  const [open, setOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const byCategory = signals.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, TechnicalSignal[]>);

  const categories: Array<{ key: string; label: string; icon: string }> = [
    { key: '趨勢', label: '趨勢', icon: '📊' },
    { key: '力道', label: '力道', icon: '⚡' },
    { key: '波動', label: '波動', icon: '🌊' },
    { key: '量能', label: '量能', icon: '📦' },
  ];

  return (
    <>
      <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between cursor-pointer select-none mb-4" onClick={() => setOpen(v => !v)}>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-200">技術訊號</h3>
            <button
              onClick={e => { e.stopPropagation(); setShowModal(true); }}
              className="w-5 h-5 rounded-full bg-slate-700/60 hover:bg-blue-700/60 text-slate-400 hover:text-blue-300 text-xs font-bold flex items-center justify-center transition-all border border-slate-600/40 hover:border-blue-600/40"
              title="說明此組合的使用邏輯"
            >
              ?
            </button>
          </div>
          <span className={`text-slate-500 text-sm transition-transform duration-200 ${open ? '' : '-rotate-90'}`}>▾</span>
        </div>
        {open && <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {categories.map(({ key, label, icon }) => {
            const catSignals = byCategory[key] ?? [];
            const primary = catSignals[0];
            if (!primary) return null;
            const style = typeStyles[primary.type];
            return (
              <div key={key} className={`rounded-lg border p-3 ${style.card}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                    {icon} {label}
                  </span>
                </div>
                <div className={`font-semibold text-sm ${style.text} mb-1`}>{primary.title}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{primary.detail}</div>
                {catSignals.slice(1).map(s => (
                  <div key={s.id} className="mt-2 pt-2 border-t border-slate-700/40">
                    <div className={`text-xs font-medium ${typeStyles[s.type].text}`}>{s.icon} {s.title}</div>
                    <div className="text-xs text-slate-600">{s.detail}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>}
      </div>

      {showModal && <TechExplainModal onClose={() => setShowModal(false)} />}
    </>
  );
}
