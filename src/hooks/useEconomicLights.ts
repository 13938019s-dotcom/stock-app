import { useState, useEffect } from 'react';
import type { EconomicLight } from '../types/stock';

const STORAGE_KEY = 'stockiq_economic_lights';

const LIGHT_LABELS: Record<EconomicLight['light'], string> = {
  red: '紅燈',
  'yellow-red': '黃紅燈',
  green: '綠燈',
  'yellow-blue': '黃藍燈',
  blue: '藍燈',
};

// 國發會景氣對策信號分數區間：38-45 紅燈、32-37 黃紅燈、23-31 綠燈、17-22 黃藍燈、9-16 藍燈
export function scoreToLight(score: number): EconomicLight['light'] {
  if (score >= 38) return 'red';
  if (score >= 32) return 'yellow-red';
  if (score >= 23) return 'green';
  if (score >= 17) return 'yellow-blue';
  return 'blue';
}

export const BASE_LIGHTS: EconomicLight[] = [
  { date: '2026-04', score: 39, light: 'red',        lightLabel: '紅燈' },
  { date: '2026-03', score: 39, light: 'red',        lightLabel: '紅燈' },
  { date: '2026-02', score: 41, light: 'red',        lightLabel: '紅燈' },
  { date: '2026-01', score: 39, light: 'red',        lightLabel: '紅燈' },
  { date: '2025-12', score: 38, light: 'red',        lightLabel: '紅燈' },
  { date: '2025-11', score: 37, light: 'yellow-red', lightLabel: '黃紅燈' },
  { date: '2025-10', score: 35, light: 'yellow-red', lightLabel: '黃紅燈' },
  { date: '2025-09', score: 34, light: 'yellow-red', lightLabel: '黃紅燈' },
  { date: '2025-08', score: 31, light: 'green',      lightLabel: '綠燈' },
  { date: '2025-07', score: 29, light: 'green',      lightLabel: '綠燈' },
  { date: '2025-06', score: 29, light: 'green',      lightLabel: '綠燈' },
  { date: '2025-05', score: 31, light: 'green',      lightLabel: '綠燈' },
  { date: '2025-04', score: 33, light: 'yellow-red', lightLabel: '黃紅燈' },
  { date: '2025-03', score: 33, light: 'yellow-red', lightLabel: '黃紅燈' },
];

function loadCustom(): EconomicLight[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveCustom(list: EconomicLight[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function useEconomicLights() {
  const [custom, setCustom] = useState<EconomicLight[]>(loadCustom);

  useEffect(() => { saveCustom(custom); }, [custom]);

  const lights = [...custom, ...BASE_LIGHTS.filter(b => !custom.some(c => c.date === b.date))]
    .sort((a, b) => b.date.localeCompare(a.date));

  const add = (date: string, score: number) => {
    const light = scoreToLight(score);
    const entry: EconomicLight = { date, score, light, lightLabel: LIGHT_LABELS[light] };
    setCustom(prev => [...prev.filter(c => c.date !== date), entry]);
  };

  const remove = (date: string) => {
    setCustom(prev => prev.filter(c => c.date !== date));
  };

  const customDates = new Set(custom.map(c => c.date));

  return { lights, add, remove, customDates };
}
