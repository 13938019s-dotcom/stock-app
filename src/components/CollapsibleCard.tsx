import { useState } from 'react';

interface Props {
  title: React.ReactNode;
  extra?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  cardClass?: string;
}

const BASE = 'bg-[#0c1628] rounded-xl border border-slate-700/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]';

export function CollapsibleCard({ title, extra, defaultOpen = true, children, cardClass = BASE }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cardClass}>
      <div className="flex items-center cursor-pointer select-none" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center gap-2 flex-1">{title}</div>
        {extra && <div onClick={e => e.stopPropagation()} className="mr-2">{extra}</div>}
        <span className={`text-slate-500 text-sm transition-transform duration-200 ${open ? '' : '-rotate-90'}`}>▾</span>
      </div>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
