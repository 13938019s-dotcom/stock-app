import { useState, useEffect } from 'react';

export interface AlertItem {
  symbol: string;
  name: string;
  high?: number;
  low?: number;
  enabled: boolean;
  firedHigh: boolean;
  firedLow: boolean;
}

const KEY = 'stockiq_alerts';

function load(): AlertItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); }
  catch { return []; }
}

export function useAlerts() {
  const [items, setItems] = useState<AlertItem[]>(load);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);

  const upsert = (symbol: string, name: string, high?: number, low?: number) => {
    setItems(prev => {
      const idx = prev.findIndex(a => a.symbol.toLowerCase() === symbol.toLowerCase());
      const next: AlertItem = { symbol, name, high, low, enabled: true, firedHigh: false, firedLow: false };
      if (idx >= 0) { const arr = [...prev]; arr[idx] = next; return arr; }
      return [...prev, next];
    });
  };

  const remove = (symbol: string) =>
    setItems(prev => prev.filter(a => a.symbol.toLowerCase() !== symbol.toLowerCase()));

  const get = (symbol: string) =>
    items.find(a => a.symbol.toLowerCase() === symbol.toLowerCase());

  const markFired = (symbol: string, direction: 'high' | 'low') =>
    setItems(prev => prev.map(a =>
      a.symbol.toLowerCase() === symbol.toLowerCase()
        ? { ...a, firedHigh: direction === 'high' ? true : a.firedHigh, firedLow: direction === 'low' ? true : a.firedLow }
        : a
    ));

  const resetFired = (symbol: string) =>
    setItems(prev => prev.map(a =>
      a.symbol.toLowerCase() === symbol.toLowerCase()
        ? { ...a, firedHigh: false, firedLow: false }
        : a
    ));

  return { items, upsert, remove, get, markFired, resetFired };
}
