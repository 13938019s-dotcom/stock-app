import { forwardRef, useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { getTWName, searchStocks, hasChinese } from '../utils/stockNames';
import type { StockSuggestion } from '../utils/stockNames';
import { searchTWByName } from '../services/twseApi';

interface Props {
  onSearch: (symbol: string) => void;
  loading: boolean;
}

const QUICK = ['2330', '2317', '2412', '0050', '2454', '3008', '2882', '^TWII', 'NVDA', 'AAPL'];

function SearchHelpModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0c1628] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] border border-slate-700/40 max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40">
          <h2 className="text-base font-bold text-white">為什麼找不到股票？</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-700/60 hover:text-slate-200 transition-colors text-lg">×</button>
        </div>

        <div className="px-6 py-5 space-y-4 text-sm text-slate-300">
          <div className="bg-blue-950/50 border border-blue-800/40 rounded-xl p-4">
            <p className="font-medium text-blue-300 mb-1">輸入中文名稱可搜尋全部台股</p>
            <p className="text-blue-400/70 text-xs">支援全部上市（TWSE）及上櫃（TPEX）公司名稱搜尋。若出現多筆結果，請從下拉選單選擇正確股票。美股請直接輸入英文代碼。</p>
          </div>

          <div>
            <p className="font-medium text-slate-300 mb-2">解決方法：直接輸入股票代碼</p>
            <div className="space-y-2">
              {[
                { flag: '🇹🇼', title: '台股', desc: '輸入 4~6 位數字', examples: ['2330', '8299', '00878'] },
                { flag: '🇺🇸', title: '美股', desc: '輸入英文代碼', examples: ['AAPL', 'NVDA', 'TSLA'] },
                { flag: '📊', title: '台灣加權指數', desc: '輸入', examples: ['^TWII'] },
              ].map(row => (
                <div key={row.title} className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-2.5 border border-slate-700/30">
                  <span className="text-lg">{row.flag}</span>
                  <div>
                    <p className="font-medium text-xs text-slate-400">{row.title}</p>
                    <p className="text-xs text-slate-500">{row.desc}，例如{' '}
                      {row.examples.map(e => (
                        <span key={e} className="font-mono font-bold text-blue-400">{e} </span>
                      ))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-950/50 rounded-xl p-4 text-xs text-blue-300 border border-blue-800/40">
            <p className="font-medium mb-1">小技巧</p>
            <p>打名稱時會即時出現下拉選單，從選單點選可直接帶入正確代碼，不用手動查詢。</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-700/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-b from-blue-500 to-blue-700 text-white text-sm rounded-lg hover:from-blue-400 hover:to-blue-600 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_12px_rgba(59,130,246,0.3)] border border-blue-400/20 font-medium"
          >
            了解了
          </button>
        </div>
      </div>
    </div>
  );
}

export const SearchBar = forwardRef<HTMLInputElement, Props>(function SearchBar({ onSearch, loading }, forwardedRef) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [nameError, setNameError] = useState('');
  const [searching, setSearching] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSuggestions(searchStocks(input));
    setHighlighted(-1);
    setNameError('');
  }, [input]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowSug(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const submit = async (symbol?: string) => {
    let val = (symbol ?? input).trim();
    if (!val) return;

    if (!symbol) {
      // 1. Try local dictionary first (instant)
      const matches = searchStocks(val);
      const exact = matches.find(m => m.name === val);
      if (exact) {
        val = exact.code;
      } else if (matches.length === 1) {
        val = matches[0].code;
      } else if (hasChinese(val)) {
        // 2. Fallback: search TWSE/TPEX company listing
        setSearching(true);
        setNameError('搜尋中…');
        try {
          const twResults = await searchTWByName(val);
          if (twResults.length === 1) {
            val = twResults[0].code;
          } else if (twResults.length > 1) {
            // Show matches in dropdown for user to pick
            setSuggestions(twResults as StockSuggestion[]);
            setShowSug(true);
            setNameError(`找到 ${twResults.length} 筆結果，請從下方選單選擇`);
            setSearching(false);
            return;
          } else {
            setNameError(`找不到「${val}」，請直接輸入股票代碼（如 2330）`);
            setSearching(false);
            return;
          }
        } catch {
          setNameError(`找不到「${val}」，請直接輸入股票代碼（如 2330）`);
          setSearching(false);
          return;
        }
        setSearching(false);
      }
    }

    setNameError('');
    onSearch(val);
    setInput('');
    setShowSug(false);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { setHighlighted(h => Math.min(h + 1, suggestions.length - 1)); return; }
    if (e.key === 'ArrowUp')   { setHighlighted(h => Math.max(h - 1, -1)); return; }
    if (e.key === 'Escape')    { setShowSug(false); return; }
    if (e.key === 'Enter') {
      if (highlighted >= 0 && suggestions[highlighted]) submit(suggestions[highlighted].code);
      else submit();
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <div ref={wrapRef} className="relative">
            <input
              ref={forwardedRef}
              value={input}
              onChange={e => { setInput(e.target.value); setShowSug(true); }}
              onKeyDown={onKey}
              onFocus={() => setShowSug(true)}
              placeholder="代碼或名稱（2330 / 台積 / AAPL）"
              className="border border-slate-700/60 bg-slate-800/70 text-slate-100 placeholder:text-slate-600 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-600/50 transition-all"
            />
            {showSug && suggestions.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-[#0c1628] rounded-lg border border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50 overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={s.code}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${
                      i === highlighted ? 'bg-blue-600/20 text-blue-200' : 'text-slate-300 hover:bg-slate-700/50'
                    }`}
                    onMouseDown={() => submit(s.code)}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-slate-500 font-mono">{s.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 分析 button — metallic blue */}
          <button
            onClick={() => submit()}
            disabled={loading || searching}
            className="bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_12px_rgba(59,130,246,0.25)] border border-blue-400/20"
          >
            {searching ? '搜尋中…' : loading ? '載入中…' : '分析'}
          </button>
          {/* Help button */}
          <button
            onClick={() => setShowHelp(true)}
            className="w-6 h-6 rounded-full bg-gradient-to-b from-slate-600/70 to-slate-800/70 hover:from-slate-500/70 hover:to-slate-700/70 text-slate-400 hover:text-blue-300 text-xs font-bold flex items-center justify-center transition-all border border-slate-600/30 flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            title="搜尋說明"
          >
            ?
          </button>
        </div>
        {nameError && (
          <p className="text-xs text-amber-400">{nameError}</p>
        )}
        <div className="flex gap-1 flex-wrap">
          {QUICK.map(s => {
            const twName = getTWName(s);
            return (
              <button
                key={s}
                onClick={() => onSearch(s)}
                className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-b from-slate-700/60 to-slate-800/60 hover:from-slate-600/60 hover:to-slate-700/60 text-slate-400 hover:text-slate-200 transition-all border border-slate-700/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                {twName ? `${s} ${twName}` : s}
              </button>
            );
          })}
        </div>
      </div>

      {showHelp && <SearchHelpModal onClose={() => setShowHelp(false)} />}
    </>
  );
});
