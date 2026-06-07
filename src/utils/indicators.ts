import type { OHLCV, Indicators, FibLevel } from '../types/stock';

function calcMA(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    return sum / period;
  });
}

function calcEMA(values: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) result.push(NaN);
    else if (i === period - 1) result.push(ema);
    else { ema = values[i] * k + ema * (1 - k); result.push(ema); }
  }
  return result;
}

function calcMACD(closes: number[]) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine: (number | null)[] = ema12.map((v, i) =>
    !isNaN(v) && !isNaN(ema26[i]) ? v - ema26[i] : null
  );

  const validMacd = macdLine.filter((v): v is number => v !== null);
  const signalRaw = calcEMA(validMacd, 9);

  const signalLine: (number | null)[] = [];
  let idx = 0;
  macdLine.forEach(v => {
    if (v === null) { signalLine.push(null); }
    else { signalLine.push(isNaN(signalRaw[idx]) ? null : signalRaw[idx]); idx++; }
  });

  const histogram: (number | null)[] = macdLine.map((v, i) =>
    v !== null && signalLine[i] !== null ? v - signalLine[i]! : null
  );
  return { macdLine, signalLine, histogram };
}

function calcKD(highs: number[], lows: number[], closes: number[], period = 9) {
  const K: number[] = [], D: number[] = [];
  let prevK = 50, prevD = 50;
  closes.forEach((close, i) => {
    if (i < period - 1) { K.push(NaN); D.push(NaN); return; }
    const highSlice = highs.slice(i - period + 1, i + 1);
    const lowSlice = lows.slice(i - period + 1, i + 1);
    const highest = Math.max(...highSlice);
    const lowest = Math.min(...lowSlice);
    const rsv = highest === lowest ? 50 : ((close - lowest) / (highest - lowest)) * 100;
    const k = prevK * (2 / 3) + rsv * (1 / 3);
    const d = prevD * (2 / 3) + k * (1 / 3);
    K.push(k); D.push(d);
    prevK = k; prevD = d;
  });
  return { K, D };
}

function calcRSI(closes: number[], period = 14): (number | null)[] {
  if (closes.length < period + 1) return closes.map(() => null);
  const result: (number | null)[] = new Array(period).fill(null);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = closes[i] - closes[i - 1];
    if (ch > 0) avgGain += ch; else avgLoss += Math.abs(ch);
  }
  avgGain /= period; avgLoss /= period;
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  for (let i = period + 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(ch, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.abs(Math.min(ch, 0))) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

function calcBollinger(closes: number[], period = 20, mult = 2) {
  const middle = calcMA(closes, period);
  const upper: (number | null)[] = [], lower: (number | null)[] = [], width: (number | null)[] = [];
  closes.forEach((_, i) => {
    const mid = middle[i];
    if (mid === null || i < period - 1) { upper.push(null); lower.push(null); width.push(null); return; }
    const slice = closes.slice(i - period + 1, i + 1);
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mid) ** 2, 0) / period);
    upper.push(mid + mult * std);
    lower.push(mid - mult * std);
    width.push((mult * 2 * std) / mid);
  });
  return { upper, middle, lower, width };
}

function calcBIAS(closes: number[], ma: (number | null)[]): (number | null)[] {
  return closes.map((c, i) => ma[i] !== null ? ((c - ma[i]!) / ma[i]!) * 100 : null);
}

export function calcAllIndicators(ohlcv: OHLCV[]): Indicators {
  const closes = ohlcv.map(d => d.close);
  const highs = ohlcv.map(d => d.high);
  const lows = ohlcv.map(d => d.low);

  const ma5 = calcMA(closes, 5);
  const ma20 = calcMA(closes, 20);
  const ma60 = calcMA(closes, 60);
  const bollinger = calcBollinger(closes);
  const { macdLine, signalLine, histogram } = calcMACD(closes);
  const { K, D } = calcKD(highs, lows, closes);
  const rsi = calcRSI(closes);
  const bias20 = calcBIAS(closes, ma20);
  const bias60 = calcBIAS(closes, ma60);

  return {
    ma5, ma20, ma60,
    bollingerUpper: bollinger.upper,
    bollingerMiddle: bollinger.middle,
    bollingerLower: bollinger.lower,
    bollingerWidth: bollinger.width,
    macdLine, macdSignal: signalLine, macdHistogram: histogram,
    kdK: K, kdD: D, rsi,
    bias20, bias60,
  };
}

export function calcFibonacci(ohlcv: OHLCV[]): { levels: FibLevel[]; swingHigh: number; swingLow: number } {
  // Use last 52 weeks to find swing high/low
  const recent = ohlcv.slice(-252);
  const swingHigh = Math.max(...recent.map(d => d.high));
  const swingLow = Math.min(...recent.map(d => d.low));
  const range = swingHigh - swingLow;

  const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const labels = ['0% (高點)', '23.6%', '38.2%', '50%', '61.8% ★', '78.6%', '100% (低點)'];

  const levels: FibLevel[] = ratios.map((r, i) => ({
    ratio: r,
    price: swingHigh - range * r,
    label: labels[i],
  }));

  return { levels, swingHigh, swingLow };
}
