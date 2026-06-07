import { useEffect } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function InfoModal({ title, onClose, children }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#0c1628] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] border border-slate-700/40 max-w-lg w-full mt-16 mb-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40">
          <h2 className="font-bold text-white text-base">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-700/60 hover:text-slate-200 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto text-sm">
          {children}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-700/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gradient-to-b from-blue-500 to-blue-700 text-white text-xs rounded-lg hover:from-blue-400 hover:to-blue-600 transition-all border border-blue-400/20 font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
          >
            了解了
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reusable ? button ─────────────────────────────────────────────────────────
export function InfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-5 h-5 rounded-full border border-slate-600/60 text-slate-500 hover:border-blue-500/60 hover:text-blue-400 transition-colors text-[11px] font-bold leading-none flex items-center justify-center flex-shrink-0"
      title="說明"
    >
      ?
    </button>
  );
}
