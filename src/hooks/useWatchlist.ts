import { useState, useEffect } from 'react';
import { getTWName } from '../utils/stockNames';

export interface WatchItem {
  symbol: string;       // e.g. "2330.TW" or "AAPL"
  displayCode: string;  // e.g. "2330"
  name: string;
  addedAt: number;
  note?: string;
}

const STORAGE_KEY = 'stockiq_watchlist';

function load(): WatchItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(list: WatchItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchItem[]>(load);

  useEffect(() => { save(items); }, [items]);

  const add = (symbol: string, name?: string) => {
    const displayCode = symbol.replace(/\.TW$/i, '');
    if (items.some(i => i.symbol.toLowerCase() === symbol.toLowerCase())) return;
    const chineseName = getTWName(symbol) ?? name ?? displayCode;
    setItems(prev => [...prev, { symbol, displayCode, name: chineseName, addedAt: Date.now() }]);
  };

  const remove = (symbol: string) => {
    setItems(prev => prev.filter(i => i.symbol.toLowerCase() !== symbol.toLowerCase()));
  };

  const has = (symbol: string) => items.some(i => i.symbol.toLowerCase() === symbol.toLowerCase());

  const updateName = (symbol: string, name: string) => {
    setItems(prev => prev.map(i =>
      i.symbol.toLowerCase() === symbol.toLowerCase() ? { ...i, name } : i
    ));
  };

  const reorder = (from: number, to: number) => {
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const updateNote = (symbol: string, note: string) => {
    setItems(prev => prev.map(i =>
      i.symbol.toLowerCase() === symbol.toLowerCase() ? { ...i, note: note.trim() || undefined } : i
    ));
  };

  return { items, add, remove, has, reorder, updateName, updateNote };
}
