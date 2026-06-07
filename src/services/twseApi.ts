export interface TWRatioData {
  pe: number | null;
  dividendYield: number | null;    // percent, e.g. 3.56 means 3.56%
  dividendPerShare: number | null; // annual cash dividend per share (TWD)
  pbr: number | null;
  industry: string | null;         // e.g. '半導體業'
  chineseName: string | null;      // official Chinese short name
}

function parsePosNum(s: string | undefined | null): number | null {
  const n = parseFloat(s ?? '');
  return isFinite(n) && n > 0 ? n : null;
}

// TWSE/TPEX industry code → Chinese name
const INDUSTRY_CODE: Record<string, string> = {
  '01': '水泥工業',      '02': '食品工業',      '03': '塑膠工業',
  '04': '紡織纖維',      '05': '電機機械',      '06': '電器電纜',
  '08': '玻璃陶瓷',      '09': '造紙工業',      '10': '鋼鐵工業',
  '11': '橡膠工業',      '12': '汽車工業',      '14': '建材營造',
  '15': '航運業',        '16': '觀光事業',       '17': '金融保險業',
  '18': '貿易百貨',      '19': '綜合業',         '20': '其他業',
  '21': '化學工業',      '22': '生技醫療業',     '23': '油電燃氣業',
  '24': '半導體業',      '25': '電腦及週邊設備業', '26': '光電業',
  '27': '通信網路業',    '28': '電子零組件業',   '29': '電子通路業',
  '30': '資訊服務業',    '31': '其他電子業',     '32': '文化創意業',
  '33': '農業科技業',    '34': '電子商務業',     '35': '綠能環保業',
  '36': '數位雲端業',    '37': '運動休閒業',     '38': '居家生活業',
  '39': '管理股票',
};

// Module-level in-flight promise deduplication + cache
let twsePromise: Promise<Map<string, TWRatioData>> | null = null;
let tpexPromise: Promise<Map<string, TWRatioData>> | null = null;
let twseCache: Map<string, TWRatioData> | null = null;
let tpexCache: Map<string, TWRatioData> | null = null;

// Company name search index: code → display name
let twseNames: { code: string; name: string }[] = [];
let tpexNames: { code: string; name: string }[] = [];
// Fast lookup maps for Chinese name resolution
let twseNameMap = new Map<string, string>(); // code → Chinese short name
let tpexNameMap = new Map<string, string>();

async function loadTWSE(): Promise<Map<string, TWRatioData>> {
  if (twseCache) return twseCache;
  if (twsePromise) return twsePromise;

  twsePromise = (async () => {
    try {
      // Fetch ratios and company info in parallel
      const [ratioRes, companyRes] = await Promise.all([
        fetch('/api/twse/v1/exchangeReport/BWIBBU_ALL'),
        fetch('/api/twse/v1/opendata/t187ap03_L'),
      ]);

      // Build code → industry name map, and populate search index
      const industryByCode = new Map<string, string>();
      if (companyRes.ok) {
        try {
          const companies: any[] = await companyRes.json();
          twseNames = [];
          twseNameMap = new Map();
          for (const c of companies) {
            const code = (c['公司代號'] ?? '').trim();
            const shortName = (c['公司簡稱'] ?? '').trim();
            const fullName = (c['公司名稱'] ?? '').trim();
            const indCode = (c['產業別'] ?? '').trim();
            if (!code) continue;
            const displayName = shortName || fullName;
            if (displayName) {
              twseNames.push({ code, name: displayName });
              twseNameMap.set(code, displayName);
            }
            if (indCode) industryByCode.set(code, INDUSTRY_CODE[indCode] ?? indCode);
          }
        } catch {
          // companies info unavailable — names will come from ratio API's Name field
        }
      }

      if (!ratioRes.ok) return new Map();
      const data: any[] = await ratioRes.json();
      const map = new Map<string, TWRatioData>();
      for (const row of data) {
        const code: string = (row['Code'] ?? '').trim();
        if (!code) continue;
        // Use Name from ratio API as fallback when companies info didn't provide it
        const nameFromRatio = (row['Name'] ?? '').trim();
        if (nameFromRatio && !twseNameMap.has(code)) {
          twseNameMap.set(code, nameFromRatio);
          twseNames.push({ code, name: nameFromRatio });
        }
        const resolvedName = twseNameMap.get(code) ?? nameFromRatio ?? null;
        map.set(code, {
          pe: parsePosNum(row['PEratio']),
          dividendYield: parsePosNum(row['DividendYield']),
          dividendPerShare: null,
          pbr: parsePosNum(row['PBratio']),
          industry: industryByCode.get(code) ?? null,
          chineseName: resolvedName || null,
        });
      }
      twseCache = map;
      return map;
    } catch {
      twsePromise = null; // allow retry on next call
      return new Map();
    }
  })();

  return twsePromise;
}

async function loadTPEX(): Promise<Map<string, TWRatioData>> {
  if (tpexCache) return tpexCache;
  if (tpexPromise) return tpexPromise;

  tpexPromise = (async () => {
    try {
      const ratioRes = await fetch('/api/tpex/openapi/v1/tpex_mainboard_peratio_analysis');

      const industryByCode = new Map<string, string>();

      if (!ratioRes.ok) return new Map();
      const data: any[] = await ratioRes.json();
      const map = new Map<string, TWRatioData>();
      for (const row of data) {
        const code: string = (row['SecuritiesCompanyCode'] ?? '').trim();
        if (!code) continue;
        // Populate name map from ratio API's CompanyName if companies info didn't provide it
        const nameFromRatio = (row['CompanyName'] ?? '').trim();
        if (nameFromRatio && !tpexNameMap.has(code)) {
          tpexNameMap.set(code, nameFromRatio);
          tpexNames.push({ code, name: nameFromRatio });
        }
        const resolvedName = tpexNameMap.get(code) ?? nameFromRatio ?? null;
        map.set(code, {
          pe: parsePosNum(row['PriceEarningRatio']),
          dividendYield: parsePosNum(row['YieldRatio']),
          dividendPerShare: parsePosNum(row['DividendPerShare']),
          pbr: parsePosNum(row['PriceBookRatio']),
          industry: industryByCode.get(code) ?? null,
          chineseName: resolvedName || null,
        });
      }
      tpexCache = map;
      return map;
    } catch {
      tpexPromise = null; // allow retry on next call
      return new Map();
    }
  })();

  return tpexPromise;
}

/**
 * Fetch official PE ratio, dividend yield, dividend per share, and industry
 * for a Taiwan stock. Tries TWSE (上市) first, then TPEX (上櫃).
 */
export async function fetchTWRatios(symbol: string): Promise<TWRatioData | null> {
  const code = symbol.replace(/\.(TW|TWO)$/i, '').trim();
  if (!/^\d{4,6}[A-Z]{0,2}$/i.test(code)) return null;

  const [twse, tpex] = await Promise.all([loadTWSE(), loadTPEX()]);
  return twse.get(code) ?? tpex.get(code) ?? null;
}

/**
 * Search Taiwan listed/OTC companies by Chinese name (partial match).
 * Ensures TWSE/TPEX data is loaded first.
 * Returns up to 10 matches sorted by name length (shorter = more exact).
 */
export async function searchTWByName(query: string): Promise<{ code: string; name: string }[]> {
  await Promise.all([loadTWSE(), loadTPEX()]);
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const seen = new Set<string>();
  const results: { code: string; name: string }[] = [];

  for (const item of [...twseNames, ...tpexNames]) {
    if (seen.has(item.code)) continue;
    if (item.name.toLowerCase().includes(q)) {
      results.push(item);
      seen.add(item.code);
    }
  }

  // Sort: exact match first, then by name length (shorter names are usually better matches)
  results.sort((a, b) => {
    if (a.name === query) return -1;
    if (b.name === query) return 1;
    return a.name.length - b.name.length;
  });

  return results.slice(0, 10);
}

/**
 * Returns the Chinese short name for a Taiwan stock, using cached TWSE/TPEX data.
 * Call after fetchTWRatios() has resolved (data will already be cached).
 */
export function getTWChineseName(symbol: string): string | null {
  const code = symbol.replace(/\.(TW|TWO)$/i, '').trim();
  return twseNameMap.get(code) ?? tpexNameMap.get(code) ?? null;
}
