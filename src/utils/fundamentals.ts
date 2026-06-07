import type { FundamentalData, FundamentalCheck } from '../types/stock';

function fmtFCF(fcf: number): string {
  const abs = Math.abs(fcf);
  const sign = fcf >= 0 ? '+' : '-';
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}兆`;
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(0)}億`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(0)}百萬`;
  return `${sign}${abs.toLocaleString()}`;
}

export function checkFundamentals(data: FundamentalData): FundamentalCheck[] {
  // ── 1. 獲利能力 ─────────────────────────────────────────────────────────────
  // Primary: EPS 連續3年增 (Yahoo) / Fallback: trailingEps > 0 (TWSE 推算)
  let epsCheck: FundamentalCheck;
  const eps3 = data.eps.slice(0, 3);
  if (eps3.length >= 3) {
    const pass = eps3[0].value > eps3[1].value && eps3[1].value > eps3[2].value;
    epsCheck = {
      id: 'eps-growth', name: '獲利成長', description: '連續 3 年 EPS 增加',
      threshold: '年年遞增',
      value: eps3.map(e => `${e.year}: ${e.value.toFixed(1)}`).join(' → '),
      numericValue: null, pass,
    };
  } else if (data.trailingEps !== null) {
    epsCheck = {
      id: 'eps-growth', name: '目前獲利', description: '每股盈餘 EPS > 0',
      threshold: '> 0',
      value: `EPS ${data.trailingEps.toFixed(2)} 元`,
      numericValue: data.trailingEps, pass: data.trailingEps > 0,
    };
  } else {
    epsCheck = {
      id: 'eps-growth', name: '獲利成長', description: '連續 3 年 EPS 增加',
      threshold: '年年遞增', value: '資料不足', numericValue: null, pass: null,
    };
  }

  // ── 2. 經營效率 ─────────────────────────────────────────────────────────────
  // Primary: ROE > 15% (Yahoo) / Fallback: 殖利率 ≥ 3% (TWSE)
  let roeCheck: FundamentalCheck;
  if (data.roe !== null) {
    roeCheck = {
      id: 'roe', name: '經營效率', description: 'ROE 股東權益報酬率',
      threshold: '> 15%',
      value: `${(data.roe * 100).toFixed(1)}%`,
      numericValue: data.roe * 100, pass: data.roe > 0.15,
    };
  } else if (data.dividendYield !== null) {
    roeCheck = {
      id: 'roe', name: '殖利率', description: '現金殖利率（配息回報）',
      threshold: '≥ 3%',
      value: `${data.dividendYield.toFixed(2)}%`,
      numericValue: data.dividendYield, pass: data.dividendYield >= 3,
    };
  } else {
    roeCheck = {
      id: 'roe', name: '經營效率', description: 'ROE 股東權益報酬率',
      threshold: '> 15%', value: '資料不足', numericValue: null, pass: null,
    };
  }

  // ── 3. 財務安全 ─────────────────────────────────────────────────────────────
  // Primary: 負債率 < 50% (Yahoo) / Fallback: 股價淨值比 < 2.0 (TWSE)
  let debtCheck: FundamentalCheck;
  if (data.debtRatio !== null) {
    debtCheck = {
      id: 'debt', name: '財務安全', description: '負債占資產比率',
      threshold: '< 50%',
      value: `${(data.debtRatio * 100).toFixed(1)}%`,
      numericValue: data.debtRatio * 100, pass: data.debtRatio < 0.5,
    };
  } else if (data.pbr !== null) {
    debtCheck = {
      id: 'debt', name: '股價淨值比', description: '市價相對帳面價值（PBR）',
      threshold: '< 3.0',
      value: `${data.pbr.toFixed(2)} 倍`,
      numericValue: data.pbr, pass: data.pbr < 3.0,
    };
  } else {
    debtCheck = {
      id: 'debt', name: '財務安全', description: '負債占資產比率',
      threshold: '< 50%', value: '資料不足', numericValue: null, pass: null,
    };
  }

  // ── 4. 估值合理 ─────────────────────────────────────────────────────────────
  // Primary: PEG < 1.2 (Yahoo) / Fallback: PE ≤ 20 (TWSE)
  let pegCheck: FundamentalCheck;
  if (data.peg !== null) {
    pegCheck = {
      id: 'peg', name: '估值合理', description: 'PEG 本益成長比',
      threshold: '< 1.2',
      value: data.peg.toFixed(2),
      numericValue: data.peg, pass: data.peg < 1.2,
    };
  } else if (data.pe !== null) {
    pegCheck = {
      id: 'peg', name: '本益比', description: '本益比（PE Ratio）',
      threshold: '< 20',
      value: `${data.pe.toFixed(1)} 倍`,
      numericValue: data.pe, pass: data.pe < 20,
    };
  } else {
    pegCheck = {
      id: 'peg', name: '估值合理', description: 'PEG 本益成長比',
      threshold: '< 1.2', value: '資料不足', numericValue: null, pass: null,
    };
  }

  // ── 5. 現金充裕 ─────────────────────────────────────────────────────────────
  // Primary: FCF > 0 (Yahoo) / Fallback: 有配息（殖利率 > 0）(TWSE)
  let fcfCheck: FundamentalCheck;
  if (data.fcf !== null) {
    fcfCheck = {
      id: 'fcf', name: '現金充裕', description: '自由現金流量',
      threshold: '> 0',
      value: fmtFCF(data.fcf),
      numericValue: data.fcf, pass: data.fcf > 0,
    };
  } else if (data.dividendYield !== null) {
    fcfCheck = {
      id: 'fcf', name: '有配息', description: '近期有現金股利',
      threshold: '> 0%',
      value: `殖利率 ${data.dividendYield.toFixed(2)}%`,
      numericValue: data.dividendYield, pass: data.dividendYield > 0,
    };
  } else {
    fcfCheck = {
      id: 'fcf', name: '現金充裕', description: '自由現金流量',
      threshold: '> 0', value: '資料不足', numericValue: null, pass: null,
    };
  }

  return [epsCheck, roeCheck, debtCheck, pegCheck, fcfCheck];
}

export function calcYieldFairValue(dividendRate: number, targetYieldLow: number, targetYieldHigh: number) {
  if (dividendRate <= 0) return null;
  return {
    highPrice: dividendRate / (targetYieldLow / 100),
    lowPrice: dividendRate / (targetYieldHigh / 100),
    dividendRate,
  };
}

export function calcPEFairValue(eps: number, refPE: number) {
  if (eps <= 0 || refPE <= 0) return null;
  return { price: eps * refPE, eps, refPE };
}

/** Benjamin Graham formula: FV = EPS × (8.5 + 2g), g = expected annual growth % */
export function calcGrahamFairValue(eps: number, growthRate: number) {
  if (eps <= 0) return null;
  const fv = eps * (8.5 + 2 * growthRate);
  return { price: Math.max(fv, 0), eps, growthRate };
}

/** CAGR from EPS history (newest first) */
export function calcEpsGrowthRate(epsHistory: { year: number; value: number }[]): number | null {
  const valid = epsHistory.filter(e => e.value > 0);
  if (valid.length < 2) return null;
  const newest = valid[0];
  const oldest = valid[valid.length - 1];
  const years = newest.year - oldest.year;
  if (years <= 0) return null;
  return (Math.pow(newest.value / oldest.value, 1 / years) - 1) * 100;
}
