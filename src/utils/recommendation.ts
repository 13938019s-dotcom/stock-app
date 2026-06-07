import type { TechnicalSignal, FundamentalCheck, Indicators, OHLCV } from '../types/stock';

export type Rating = 'strong-buy' | 'buy' | 'watch' | 'weak' | 'sell';

export interface Recommendation {
  rating: Rating;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  score: number;
  techScore: number;
  fundScore: number;
  reasons: string[];
  cautions: string[];
}

export function calcRecommendation(
  ohlcv: OHLCV[],
  indicators: Indicators,
  _signals: TechnicalSignal[],
  fundChecks: FundamentalCheck[],
): Recommendation {
  const reasons: string[] = [];
  const cautions: string[] = [];
  let tech = 50;

  const last = ohlcv.length - 1;
  const close = ohlcv[last].close;
  const ma20 = indicators.ma20[last];
  const k = indicators.kdK[last];
  const d = indicators.kdD[last];
  const kPrev = indicators.kdK[last - 1];
  const dPrev = indicators.kdD[last - 1];
  const macd = indicators.macdLine[last];
  const sig = indicators.macdSignal[last];
  const macdPrev = indicators.macdLine[last - 1];
  const sigPrev = indicators.macdSignal[last - 1];
  const rsi = indicators.rsi[last];
  const bias20 = indicators.bias20[last];

  const avgVol = ohlcv.slice(last - 20, last).reduce((a, b) => a + b.volume, 0) / 20;
  const volRatio = ohlcv[last].volume / avgVol;
  const priceUp = close > ohlcv[last - 1].close;

  const aboveMA20 = ma20 !== null && close > ma20;
  if (aboveMA20) {
    tech += 15;
    reasons.push(`股價 ${close.toFixed(1)} 站上 MA20 (${ma20!.toFixed(1)})，多頭趨勢`);
  } else {
    tech -= 20;
    cautions.push(`股價低於 MA20，按策略暫不買入`);
  }

  if (!isNaN(k) && !isNaN(d)) {
    if (k < 20 && d < 20 && k > d && kPrev <= dPrev) {
      tech += 20;
      reasons.push(`KD 低檔黃金交叉 (K=${k.toFixed(0)})，強力反彈訊號`);
    } else if (k < 20) {
      tech += 8;
      reasons.push(`KD 超賣區 (K=${k.toFixed(0)})，等待黃金交叉`);
    } else if (k > 80) {
      tech -= 15;
      cautions.push(`KD 超買 (K=${k.toFixed(0)})，短線注意回調`);
    }
  }

  if (macd !== null && sig !== null && macdPrev !== null && sigPrev !== null) {
    if (macd > sig && macdPrev <= sigPrev) {
      tech += 12;
      reasons.push('MACD 黃金交叉，多頭動能啟動');
    } else if (macd < sig && macdPrev >= sigPrev) {
      tech -= 12;
      cautions.push('MACD 死亡交叉，動能轉弱');
    } else if (macd > sig) {
      tech += 5;
    } else {
      tech -= 5;
    }
  }

  if (rsi !== null) {
    if (rsi < 30) { tech += 8; reasons.push(`RSI 超賣 (${rsi.toFixed(0)})，逢低機會`); }
    else if (rsi > 75) { tech -= 10; cautions.push(`RSI 超買 (${rsi.toFixed(0)})，短線偏高`); }
  }

  if (priceUp && volRatio > 1.5) {
    tech += 8;
    reasons.push(`價漲量增 (量 ${(volRatio * 100).toFixed(0)}% 均量)，攻擊訊號健康`);
  } else if (!priceUp && volRatio > 1.5) {
    tech -= 10;
    cautions.push(`價跌量增，賣壓較重`);
  }

  if (bias20 !== null && bias20 > 12) {
    tech -= 8;
    cautions.push(`MA20 乖離率 +${bias20.toFixed(1)}%，短期過熱`);
  }

  tech = Math.max(0, Math.min(100, tech));

  const checked = fundChecks.filter(c => c.pass !== null);
  const passed = fundChecks.filter(c => c.pass === true);
  const fundScore = checked.length > 0 ? Math.round((passed.length / checked.length) * 100) : 50;

  if (passed.length >= 4) reasons.push(`基本面 ${passed.length}/${checked.length} 項達標，體質良好`);
  else if (passed.length <= 2 && checked.length > 0) cautions.push(`基本面 ${passed.length}/${checked.length} 項達標，需謹慎`);

  const w = checked.length > 0 ? 0.65 : 1.0;
  const score = Math.round(w * tech + (1 - w) * fundScore);

  let rating: Rating;
  let label: string;
  let color: string;
  let bgColor: string;
  let borderColor: string;

  if (score >= 78) {
    rating = 'strong-buy'; label = '強力買入'; color = 'text-red-400';
    bgColor = 'bg-red-950/60'; borderColor = 'border-red-800/50';
  } else if (score >= 62) {
    rating = 'buy'; label = '偏向買入'; color = 'text-orange-400';
    bgColor = 'bg-orange-950/60'; borderColor = 'border-orange-800/50';
  } else if (score >= 45) {
    rating = 'watch'; label = '觀望為主'; color = 'text-amber-400';
    bgColor = 'bg-amber-950/60'; borderColor = 'border-amber-800/50';
  } else if (score >= 30) {
    rating = 'weak'; label = '偏向保守'; color = 'text-blue-400';
    bgColor = 'bg-blue-950/60'; borderColor = 'border-blue-800/50';
  } else {
    rating = 'sell'; label = '避開/賣出'; color = 'text-emerald-400';
    bgColor = 'bg-emerald-950/60'; borderColor = 'border-emerald-800/50';
  }

  return { rating, label, color, bgColor, borderColor, score, techScore: tech, fundScore, reasons, cautions };
}
