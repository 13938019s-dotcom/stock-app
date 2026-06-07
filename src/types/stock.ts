export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockInfo {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  currency: string;
  dividendRate?: number;
  dividendYield?: number;
  industry?: string;
}

export interface FundamentalData {
  eps: { year: number; value: number }[];
  roe: number | null;
  debtRatio: number | null;
  peg: number | null;
  fcf: number | null;
  trailingEps: number | null;
  pe: number | null;
  dividendRate: number | null;
  dividendYield: number | null; // % e.g. 3.56
  pbr: number | null;           // price-to-book ratio
}

export interface FundamentalCheck {
  id: string;
  name: string;
  description: string;
  threshold: string;
  value: string;
  numericValue: number | null;
  pass: boolean | null;
}

export interface TechnicalSignal {
  id: string;
  type: 'buy' | 'watch' | 'warning' | 'neutral';
  category: '趨勢' | '力道' | '波動' | '量能';
  icon: string;
  title: string;
  detail: string;
}

export interface Indicators {
  ma5: (number | null)[];
  ma20: (number | null)[];
  ma60: (number | null)[];
  bollingerUpper: (number | null)[];
  bollingerMiddle: (number | null)[];
  bollingerLower: (number | null)[];
  bollingerWidth: (number | null)[];
  macdLine: (number | null)[];
  macdSignal: (number | null)[];
  macdHistogram: (number | null)[];
  kdK: number[];
  kdD: number[];
  rsi: (number | null)[];
  bias20: (number | null)[];
  bias60: (number | null)[];
}

export interface FibLevel {
  ratio: number;
  price: number;
  label: string;
}

export interface SupportLevel {
  label: string;
  price: number;
  pct: number;
  source: 'fib' | 'ma' | 'bollinger';
}

export interface EconomicLight {
  date: string;
  score: number;
  light: 'red' | 'yellow-red' | 'green' | 'yellow-blue' | 'blue';
  lightLabel: string;
}
