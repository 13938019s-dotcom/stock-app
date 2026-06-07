import type { OHLCV, StockInfo, FundamentalData } from '../types/stock';
import { getTWName } from '../utils/stockNames';

const BASE = '/api/yahoo';

function candidateTickers(symbol: string): string[] {
  const s = symbol.trim().toUpperCase();
  // Taiwan stock codes: pure digits (2330, 0050) OR digits+letter suffix (00631L, 00632R)
  if (/^\d{4,6}[A-Z]{0,2}$/.test(s)) return [`${s}.TW`, `${s}.TWO`];
  return [s];
}

export async function fetchPriceData(symbol: string): Promise<{ info: StockInfo; ohlcv: OHLCV[] }> {
  const candidates = candidateTickers(symbol);
  let res: Response | null = null;
  let ticker = candidates[0];
  for (const t of candidates) {
    const r = await fetch(`${BASE}/v8/finance/chart/${encodeURIComponent(t)}?interval=1d&range=1y`);
    if (r.ok) { res = r; ticker = t; break; }
  }
  if (!res || !res.ok) throw new Error(`找不到 ${ticker.replace(/\.(TW|TWO)$/, '')} — 請確認代碼是否正確`);

  const json = await res!.json();
  if (json.chart?.error) throw new Error(json.chart.error.description ?? `找不到 ${ticker}`);

  const result = json.chart?.result?.[0];
  if (!result) throw new Error(`無法取得 ${ticker} 資料`);

  const meta = result.meta;
  const timestamps: number[] = result.timestamp ?? [];
  const q = result.indicators.quote[0];

  const ohlcv: OHLCV[] = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: q.open[i],
      high: q.high[i],
      low: q.low[i],
      close: q.close[i],
      volume: q.volume[i] ?? 0,
    }))
    .filter(d => d.close != null && !isNaN(d.close) && d.close > 0);

  // regularMarketPreviousClose = 昨日收盤；chartPreviousClose = 圖表起點前一收盤（1年前），不可用來算漲跌
  const prevClose = meta.regularMarketPreviousClose
    ?? ohlcv[ohlcv.length - 2]?.close
    ?? meta.regularMarketPrice;

  const chineseName = getTWName(ticker);

  const info: StockInfo = {
    symbol: ticker,
    name: chineseName ?? meta.shortName ?? meta.longName ?? ticker,
    currentPrice: meta.regularMarketPrice,
    change: meta.regularMarketPrice - prevClose,
    changePercent: ((meta.regularMarketPrice - prevClose) / prevClose) * 100,
    currency: meta.currency || 'TWD',
  };

  return { info, ohlcv };
}

export async function fetchQuote(symbol: string): Promise<{ price: number; changePercent: number } | null> {
  try {
    const r = await fetch(`${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`);
    if (!r.ok) return null;
    const json = await r.json();
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const prev = meta.regularMarketPreviousClose ?? meta.regularMarketPrice;
    return {
      price: meta.regularMarketPrice as number,
      changePercent: ((meta.regularMarketPrice - prev) / prev) * 100,
    };
  } catch { return null; }
}

export async function fetchFundamentals(symbol: string): Promise<FundamentalData> {
  const candidates = candidateTickers(symbol);
  const modules = 'financialData,defaultKeyStatistics,incomeStatementHistory,balanceSheetHistory';
  let res: Response | null = null;
  for (const t of candidates) {
    const r = await fetch(`${BASE}/v10/finance/quoteSummary/${encodeURIComponent(t)}?modules=${modules}`);
    if (r.ok) { res = r; break; }
  }
  if (!res || !res.ok) throw new Error(`HTTP 404`);

  const json = await res!.json();
  const result = json.quoteSummary?.result?.[0];
  if (!result) throw new Error('No fundamentals');

  const fin = result.financialData ?? {};
  const stats = result.defaultKeyStatistics ?? {};
  const incomeHistory: any[] = result.incomeStatementHistory?.incomeStatementHistory ?? [];
  const balanceHistory: any[] = result.balanceSheetHistory?.balanceSheetStatements ?? [];

  const eps = incomeHistory
    .filter((s) => s.basicEPS?.raw != null)
    .map((s) => ({ year: new Date(s.endDate.raw * 1000).getFullYear(), value: s.basicEPS.raw }))
    .sort((a, b) => b.year - a.year)
    .slice(0, 4);

  const roe = fin.returnOnEquity?.raw ?? null;

  let debtRatio: number | null = null;
  if (balanceHistory[0]?.totalLiab?.raw != null && balanceHistory[0]?.totalAssets?.raw != null) {
    debtRatio = balanceHistory[0].totalLiab.raw / balanceHistory[0].totalAssets.raw;
  } else if (fin.debtToEquity?.raw != null) {
    const de = fin.debtToEquity.raw / 100;
    debtRatio = de / (1 + de);
  }

  return {
    eps,
    roe,
    debtRatio,
    peg: stats.pegRatio?.raw ?? null,
    fcf: fin.freeCashflow?.raw ?? null,
    trailingEps: stats.trailingEps?.raw ?? null,
    pe: stats.trailingPE?.raw ?? null,
    dividendRate: fin.dividendRate?.raw ?? stats.dividendRate?.raw ?? null,
    dividendYield: null,
    pbr: null,
  };
}

/** Fetch OHLCV for any interval/range without re-fetching stock info */
export async function fetchOHLCV(
  symbol: string,
  interval: string = '1d',
  range: string = '1y',
): Promise<OHLCV[]> {
  const candidates = candidateTickers(symbol);
  let res: Response | null = null;
  for (const t of candidates) {
    const r = await fetch(`${BASE}/v8/finance/chart/${encodeURIComponent(t)}?interval=${interval}&range=${range}`);
    if (r.ok) { res = r; break; }
  }
  if (!res || !res.ok) throw new Error('無法取得圖表資料');
  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error('無圖表資料');
  const timestamps: number[] = result.timestamp ?? [];
  const q = result.indicators.quote[0];
  return timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i],
      volume: q.volume[i] ?? 0,
    }))
    .filter(d => d.close != null && !isNaN(d.close) && d.close > 0);
}

export async function fetchEconomicLights(): Promise<{ date: string; score: number; light: string; lightLabel: string }[]> {
  // Taiwan NDC open data API for 景氣燈號
  const res = await fetch('/api/ndc/indicator/data?id=ci&lang=zh-tw');
  if (!res.ok) throw new Error('無法取得景氣燈號');
  const json = await res.json();
  return json;
}
