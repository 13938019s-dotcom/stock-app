import type { OHLCV, TechnicalSignal } from '../types/stock';

interface Pivot { idx: number; price: number }

function findPivots(ohlcv: OHLCV[], window: number, lookback: number) {
  const start = Math.max(window, ohlcv.length - lookback);
  const highs: Pivot[] = [];
  const lows: Pivot[] = [];
  for (let i = start; i < ohlcv.length - window; i++) {
    const slice = ohlcv.slice(i - window, i + window + 1);
    const h = ohlcv[i].high, l = ohlcv[i].low;
    if (slice.every(d => d.high <= h)) highs.push({ idx: i, price: h });
    if (slice.every(d => d.low >= l)) lows.push({ idx: i, price: l });
  }
  return { highs, lows };
}

function troughBetween(lows: Pivot[], a: number, b: number): Pivot | null {
  const between = lows.filter(l => l.idx > a && l.idx < b);
  if (between.length === 0) return null;
  return between.reduce((min, l) => (l.price < min.price ? l : min));
}

function peakBetween(highs: Pivot[], a: number, b: number): Pivot | null {
  const between = highs.filter(h => h.idx > a && h.idx < b);
  if (between.length === 0) return null;
  return between.reduce((max, h) => (h.price > max.price ? h : max));
}

export function detectPatterns(ohlcv: OHLCV[]): TechnicalSignal[] {
  if (ohlcv.length < 30) return [];
  const close = ohlcv[ohlcv.length - 1].close;
  const { highs, lows } = findPivots(ohlcv, 3, 150);

  // ── 頭肩頂 Head & Shoulders Top ──
  if (highs.length >= 3) {
    const [s1, h, s2] = highs.slice(-3);
    if (h.price > s1.price * 1.02 && h.price > s2.price * 1.02 && Math.abs(s1.price - s2.price) / s1.price < 0.05) {
      const n1 = troughBetween(lows, s1.idx, h.idx);
      const n2 = troughBetween(lows, h.idx, s2.idx);
      if (n1 && n2) {
        const neckline = (n1.price + n2.price) / 2;
        const broken = close < neckline;
        return [{
          id: 'pattern-hs-top', category: '型態', icon: broken ? '⚠️' : '👀', type: broken ? 'warning' : 'watch',
          title: broken ? '頭肩頂（已跌破頸線）' : '頭肩頂（疑似成形中）',
          detail: `頭 ${h.price.toFixed(1)} 高於左右肩，頸線約 ${neckline.toFixed(1)}${broken ? '，已跌破，型態確立' : '，尚未跌破，留意後續'}`,
        }];
      }
    }
  }

  // ── 頭肩底 Head & Shoulders Bottom ──
  if (lows.length >= 3) {
    const [s1, h, s2] = lows.slice(-3);
    if (h.price < s1.price * 0.98 && h.price < s2.price * 0.98 && Math.abs(s1.price - s2.price) / s1.price < 0.05) {
      const n1 = peakBetween(highs, s1.idx, h.idx);
      const n2 = peakBetween(highs, h.idx, s2.idx);
      if (n1 && n2) {
        const neckline = (n1.price + n2.price) / 2;
        const broken = close > neckline;
        return [{
          id: 'pattern-hs-bottom', category: '型態', icon: broken ? '✅' : '👀', type: broken ? 'buy' : 'watch',
          title: broken ? '頭肩底（已突破頸線）' : '頭肩底（疑似成形中）',
          detail: `底 ${h.price.toFixed(1)} 低於左右肩，頸線約 ${neckline.toFixed(1)}${broken ? '，已突破，型態確立' : '，尚未突破，留意後續'}`,
        }];
      }
    }
  }

  // ── M頭 雙重頂 Double Top ──
  if (highs.length >= 2) {
    const [h1, h2] = highs.slice(-2);
    if (Math.abs(h1.price - h2.price) / h1.price < 0.03) {
      const trough = troughBetween(lows, h1.idx, h2.idx);
      if (trough && trough.price < Math.min(h1.price, h2.price) * 0.97) {
        const broken = close < trough.price;
        return [{
          id: 'pattern-double-top', category: '型態', icon: broken ? '⚠️' : '👀', type: broken ? 'warning' : 'watch',
          title: broken ? 'M頭雙重頂（已跌破頸線）' : 'M頭雙重頂（疑似成形中）',
          detail: `兩高點 ${h1.price.toFixed(1)} / ${h2.price.toFixed(1)} 相近，頸線約 ${trough.price.toFixed(1)}${broken ? '，已跌破，型態確立' : '，尚未跌破'}`,
        }];
      }
    }
  }

  // ── W底 雙重底 Double Bottom ──
  if (lows.length >= 2) {
    const [l1, l2] = lows.slice(-2);
    if (Math.abs(l1.price - l2.price) / l1.price < 0.03) {
      const peak = peakBetween(highs, l1.idx, l2.idx);
      if (peak && peak.price > Math.max(l1.price, l2.price) * 1.03) {
        const broken = close > peak.price;
        return [{
          id: 'pattern-double-bottom', category: '型態', icon: broken ? '✅' : '👀', type: broken ? 'buy' : 'watch',
          title: broken ? 'W底雙重底（已突破頸線）' : 'W底雙重底（疑似成形中）',
          detail: `兩低點 ${l1.price.toFixed(1)} / ${l2.price.toFixed(1)} 相近，頸線約 ${peak.price.toFixed(1)}${broken ? '，已突破，型態確立' : '，尚未突破'}`,
        }];
      }
    }
  }

  // ── 三角形整理 Triangle（高點遞減、低點遞增）──
  if (highs.length >= 2 && lows.length >= 2) {
    const [h1, h2] = highs.slice(-2);
    const [l1, l2] = lows.slice(-2);
    if (h2.price < h1.price && l2.price > l1.price && h2.price > l2.price) {
      if (close > h1.price) {
        return [{ id: 'pattern-triangle', category: '型態', icon: '✅', type: 'buy', title: '三角形向上突破', detail: `股價突破近期高點 ${h1.price.toFixed(1)}，收斂後選擇向上` }];
      }
      if (close < l1.price) {
        return [{ id: 'pattern-triangle', category: '型態', icon: '⚠️', type: 'warning', title: '三角形向下跌破', detail: `股價跌破近期低點 ${l1.price.toFixed(1)}，收斂後選擇向下` }];
      }
      return [{ id: 'pattern-triangle', category: '型態', icon: '👀', type: 'watch', title: '三角形收斂整理中', detail: `高點遞減、低點遞增，波動收斂，等待方向選擇` }];
    }
  }

  return [{ id: 'pattern-none', category: '型態', icon: 'ℹ️', type: 'neutral', title: '無明顯型態', detail: '近期走勢未符合頭肩頂/底、M頭/W底、三角形等經典型態' }];
}
