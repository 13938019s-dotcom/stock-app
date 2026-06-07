import { useState, useRef, useEffect } from 'react';
import type { WatchItem } from '../hooks/useWatchlist';
import type { AlertItem } from '../hooks/useAlerts';

interface Props {
  items: WatchItem[];
  currentSymbol: string;
  onSelect: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  onReorder: (from: number, to: number) => void;
  onUpdateNote: (symbol: string, note: string) => void;
  getAlert?: (symbol: string) => AlertItem | undefined;
  onSetAlert?: (symbol: string, name: string, high?: number, low?: number) => void;
  onRemoveAlert?: (symbol: string) => void;
  onResetAlertFired?: (symbol: string) => void;
}

export function WatchlistPanel({
  items, currentSymbol, onSelect, onRemove, onReorder, onUpdateNote,
  getAlert, onSetAlert, onRemoveAlert, onResetAlertFired,
}: Props) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Note editor
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (editingSymbol) textareaRef.current?.focus(); }, [editingSymbol]);

  // Alert editor
  const [alertSymbol, setAlertSymbol] = useState<string | null>(null);
  const [alertHigh, setAlertHigh] = useState('');
  const [alertLow, setAlertLow] = useState('');
  const alertHighRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (alertSymbol) alertHighRef.current?.focus(); }, [alertSymbol]);

  const openNote = (item: WatchItem) => {
    setAlertSymbol(null);
    setEditingSymbol(item.symbol);
    setNoteInput(item.note ?? '');
  };
  const closeNote = () => {
    if (editingSymbol) onUpdateNote(editingSymbol, noteInput);
    setEditingSymbol(null);
  };

  const openAlert = (item: WatchItem) => {
    setEditingSymbol(null);
    const existing = getAlert?.(item.symbol);
    setAlertSymbol(item.symbol);
    setAlertHigh(existing?.high?.toString() ?? '');
    setAlertLow(existing?.low?.toString() ?? '');
    if (existing?.firedHigh || existing?.firedLow) onResetAlertFired?.(item.symbol);
  };
  const saveAlert = () => {
    if (!alertSymbol) return;
    const item = items.find(i => i.symbol === alertSymbol);
    if (!item) { setAlertSymbol(null); return; }
    const h = alertHigh.trim() ? parseFloat(alertHigh) : undefined;
    const l = alertLow.trim()  ? parseFloat(alertLow)  : undefined;
    if (h != null || l != null) onSetAlert?.(item.symbol, item.name, h, l);
    else onRemoveAlert?.(item.symbol);
    setAlertSymbol(null);
  };

  if (items.length === 0) {
    return (
      <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <h3 className="font-semibold text-slate-300 mb-1.5 text-sm">⭐ 自選股</h3>
        <p className="text-xs text-slate-600">尚無自選股，點擊「加入自選」即可新增</p>
      </div>
    );
  }

  const editingItem  = items.find(i => i.symbol === editingSymbol);
  const alertingItem = items.find(i => i.symbol === alertSymbol);

  return (
    <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-300 text-sm">⭐ 自選股</h3>
        <span className="text-xs text-slate-600">{items.length} 檔 · 可拖曳排序</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => {
          const isActive  = item.symbol.toLowerCase() === currentSymbol.toLowerCase();
          const isDragging = dragFrom === i;
          const isTarget   = dragOver === i && dragFrom !== null && dragFrom !== i;
          const hasNote    = Boolean(item.note);
          const alertData  = getAlert?.(item.symbol);
          const hasAlert   = Boolean(alertData?.high != null || alertData?.low != null);
          const hasFired   = Boolean(alertData?.firedHigh || alertData?.firedLow);

          return (
            <div
              key={item.symbol}
              draggable
              onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragFrom(i); }}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOver !== i) setDragOver(i); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => { e.preventDefault(); if (dragFrom !== null && dragFrom !== i) onReorder(dragFrom, i); setDragFrom(null); setDragOver(null); }}
              onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
              className={`group flex items-center gap-1.5 rounded-full border pl-2 pr-1 py-1 select-none transition-all text-sm ${
                isActive
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                  : 'bg-slate-800/60 border-slate-700/40 text-slate-300 hover:border-blue-700/40 hover:text-slate-100'
              } ${isDragging ? 'opacity-40 scale-95' : ''} ${isTarget ? 'ring-1 ring-blue-400/70 border-blue-500/60 -translate-y-0.5 shadow-[0_0_8px_rgba(96,165,250,0.3)]' : ''}`}
            >
              {/* drag handle */}
              <span className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing text-[11px] leading-none px-0.5 flex-shrink-0">⠿</span>

              <span onClick={() => onSelect(item.symbol)} className="font-medium cursor-pointer">{item.name}</span>
              <span onClick={() => onSelect(item.symbol)} className="text-xs text-slate-500 font-mono cursor-pointer">{item.displayCode}</span>

              {/* alert bell */}
              <button
                onClick={e => { e.stopPropagation(); openAlert(item); }}
                draggable={false}
                onDragStart={e => e.stopPropagation()}
                className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] transition-colors ${
                  hasFired
                    ? 'text-red-400 animate-pulse'
                    : hasAlert
                    ? 'text-amber-400 hover:text-amber-300'
                    : 'text-slate-700 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                }`}
                title={hasFired ? '警示已觸發，點擊重設' : hasAlert ? `警示：高於${alertData?.high ?? '—'} / 低於${alertData?.low ?? '—'}` : '設定到價通知'}
              >
                🔔
              </button>

              {/* note button */}
              <button
                onClick={e => { e.stopPropagation(); openNote(item); }}
                draggable={false}
                onDragStart={e => e.stopPropagation()}
                className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] transition-colors ${
                  hasNote
                    ? 'text-amber-400 hover:text-amber-300'
                    : 'text-slate-700 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                }`}
                title={hasNote ? item.note : '新增備忘錄'}
              >
                ✎
              </button>

              {/* remove */}
              <button
                onClick={e => { e.stopPropagation(); onRemove(item.symbol); }}
                className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-slate-600 hover:bg-red-900/60 hover:text-red-400 transition-colors text-xs"
                title="移除"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Alert editor */}
      {alertSymbol && alertingItem && (
        <div className="mt-3 pt-3 border-t border-slate-700/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-amber-400 font-medium">🔔 {alertingItem.name} 到價通知</span>
            <button
              onClick={saveAlert}
              className="ml-auto text-xs px-2.5 py-0.5 rounded bg-blue-700/60 hover:bg-blue-600/60 text-blue-200 hover:text-white transition-colors"
            >
              儲存
            </button>
            <button
              onClick={() => {
                onRemoveAlert?.(alertingItem.symbol);
                setAlertSymbol(null);
              }}
              className="text-xs px-2.5 py-0.5 rounded bg-slate-700/60 hover:bg-red-900/50 text-slate-500 hover:text-red-400 transition-colors"
            >
              刪除
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 whitespace-nowrap">高於</span>
              <input
                ref={alertHighRef}
                type="number"
                value={alertHigh}
                onChange={e => setAlertHigh(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveAlert(); if (e.key === 'Escape') setAlertSymbol(null); }}
                placeholder="不設定"
                className="flex-1 bg-slate-800/60 border border-slate-700/60 rounded px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-600/50 transition-colors"
              />
              <span className="text-[11px] text-emerald-500">↑</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 whitespace-nowrap">低於</span>
              <input
                type="number"
                value={alertLow}
                onChange={e => setAlertLow(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveAlert(); if (e.key === 'Escape') setAlertSymbol(null); }}
                placeholder="不設定"
                className="flex-1 bg-slate-800/60 border border-slate-700/60 rounded px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-red-600/50 transition-colors"
              />
              <span className="text-[11px] text-red-500">↓</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-700 mt-1.5">留空表示不設定該方向。App 開啟時每 2 分鐘自動檢查。</p>
        </div>
      )}

      {/* Note editor */}
      {editingSymbol && editingItem && (
        <div className="mt-3 pt-3 border-t border-slate-700/30">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-amber-400 font-medium">✎ {editingItem.name} 備忘錄</span>
            <button
              onClick={closeNote}
              className="ml-auto text-xs px-2.5 py-0.5 rounded bg-slate-700/60 hover:bg-slate-600/60 text-slate-400 hover:text-slate-200 transition-colors"
            >
              完成
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') closeNote(); }}
            placeholder="記下買進邏輯、目標價、停損點…"
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-amber-600/50 transition-colors"
            rows={2}
          />
        </div>
      )}
    </div>
  );
}
