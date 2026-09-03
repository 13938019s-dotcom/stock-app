import { enqueueGemini } from './geminiQueue';

const API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const MODEL = 'openai/gpt-oss-120b';
const URL = '/api/groq/openai/v1/chat/completions';
const LS_PREFIX = 'stockiq_insight_';
const LS_TTL = 24 * 60 * 60 * 1000;

export interface FairValueEstimate {
  low: number;
  mid: number;
  high: number;
  basis: string;
}

export interface TradingAdvice {
  summary: string;
  ifHolding: string;
  ifEntering: string;
}

export interface CompanyInsight {
  intro: string;
  valuationLabel: '低估' | '合理偏低' | '合理' | '合理偏高' | '高估';
  valuationContent: string;
  bulls: string[];
  bears: string[];
  fairValue?: FairValueEstimate | null;
  tradingAdvice?: TradingAdvice | null;
}

const memCache = new Map<string, CompanyInsight>();

export function clearInsightCache(symbol: string) {
  memCache.delete(symbol);
  try { localStorage.removeItem(LS_PREFIX + symbol); } catch {}
}

function loadLS(symbol: string): CompanyInsight | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + symbol);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: CompanyInsight; ts: number };
    if (Date.now() - ts > LS_TTL) { localStorage.removeItem(LS_PREFIX + symbol); return null; }
    return data;
  } catch { return null; }
}

function saveLS(symbol: string, data: CompanyInsight) {
  try { localStorage.setItem(LS_PREFIX + symbol, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

interface SupportLevelInput {
  label: string;
  price: number;
  pct: number;
}

interface Params {
  symbol: string;
  name: string;
  industry?: string;
  price: number;
  currency: string;
  pe: number | null;
  eps: number | null;
  dividendYield: number | null;
  pbr: number | null;
  forwardEps?: number | null;
  peLow?: number | null;
  peHigh?: number | null;
  supportLevels?: SupportLevelInput[];
}

export async function getCompanyInsight(p: Params): Promise<CompanyInsight | null> {
  if (!API_KEY) {
    console.error('[AI] VITE_GROQ_API_KEY 未設定，請確認 .env 並重啟 dev server');
    return null;
  }
  if (memCache.has(p.symbol)) return memCache.get(p.symbol)!;
  const cached = loadLS(p.symbol);
  if (cached) { memCache.set(p.symbol, cached); return cached; }
  return enqueueGemini(() => fetchInsight(p));
}

async function fetchInsight(p: Params): Promise<CompanyInsight | null> {
  const code = p.symbol.replace(/\.TWO?$/i, '');

  const userHints: string[] = [];
  if (p.forwardEps != null) userHints.push(`使用者提供的預估 EPS（下一年度）：${p.forwardEps} 元`);
  if (p.peLow != null && p.peHigh != null) userHints.push(`使用者認定的合理 P/E 區間：${p.peLow} 倍 ～ ${p.peHigh} 倍`);
  else if (p.peLow != null) userHints.push(`使用者認定的合理 P/E 下限：${p.peLow} 倍`);
  else if (p.peHigh != null) userHints.push(`使用者認定的合理 P/E 上限：${p.peHigh} 倍`);

  const hintBlock = userHints.length > 0
    ? `\n\n【使用者自訂估值假設 — 請優先採用以下數字計算合理價，不要用訓練資料自行推估覆蓋】\n${userHints.join('\n')}`
    : '';

  const supportBlock = (p.supportLevels && p.supportLevels.length > 0)
    ? `\n\n【技術支撐位（請在操作建議中直接引用這些具體數字）】\n${p.supportLevels.map(s => `- ${s.label}：${Math.round(s.price).toLocaleString()} 元（距現價 ${s.pct.toFixed(1)}%）`).join('\n')}`
    : '';

  const prompt = `你是一位專業股票分析師，請針對以下資料，用繁體中文生成投資洞察。

股票：${p.name}（${code}）
產業：${p.industry ?? '不明'}
目前股價：${p.price.toLocaleString()} ${p.currency}
本益比 P/E：${p.pe ?? '無資料'}
每股盈餘 EPS：${p.eps ?? '無資料'}
殖利率：${p.dividendYield != null ? p.dividendYield + '%' : '無資料'}
股價淨值比 P/B：${p.pbr ?? '無資料'}${hintBlock}${supportBlock}

請輸出以下欄位：
- intro：2~3句市場背景，說明產業趨勢與公司定位
- valuation_label：從以下選一個：低估、合理偏低、合理、合理偏高、高估
- valuation_content：1~2句結合財務數據說明估值邏輯
- bulls：3個多頭論點（陣列，每點20~30字，需有具體數據或邏輯支撐）
- bears：3個空頭風險（陣列，每點20~30字，說明「如果判斷錯了，最可能的原因是」）
- fair_value_low：保守合理價（純整數，元）。若有使用者自訂假設請採用，否則依產業慣用本益比下限 × 預估EPS計算
- fair_value_mid：中立合理價（純整數，元）
- fair_value_high：樂觀合理價（純整數，元）
- fair_value_basis：一句說明採用的計算邏輯（EPS預估值 × P/E區間，或其他方法）
- trading_summary：1~2句描述目前技術面與基本面綜合狀態（例如：目前XX處於「基本面佳、技術面偏熱」的狀態）
- trading_if_holding：給已持有者的具體操作建議（引用上方支撐位數字，說明守哪個價位、跌破如何處理）
- trading_if_entering：給想進場者的具體建議（引用回測區間數字，說明等哪個價位再介入）

只輸出 JSON，不加任何 markdown 或說明文字：
{"intro":"...","valuation_label":"...","valuation_content":"...","bulls":["...","...","..."],"bears":["...","...","..."],"fair_value_low":數字,"fair_value_mid":數字,"fair_value_high":數字,"fair_value_basis":"...","trading_summary":"...","trading_if_holding":"...","trading_if_entering":"..."}`;

  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 2000,
      }),
    });
    if (!res.ok) {
      console.error('[AI] Groq HTTP error:', res.status, res.statusText);
      return null;
    }
    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('[AI] Groq 回傳格式錯誤:', text);
      return null;
    }
    const raw = JSON.parse(match[0]);
    const fvLow = typeof raw.fair_value_low === 'number' ? raw.fair_value_low : null;
    const fvMid = typeof raw.fair_value_mid === 'number' ? raw.fair_value_mid : null;
    const fvHigh = typeof raw.fair_value_high === 'number' ? raw.fair_value_high : null;
    const result: CompanyInsight = {
      intro: raw.intro ?? '',
      valuationLabel: raw.valuation_label ?? '合理',
      valuationContent: raw.valuation_content ?? '',
      bulls: Array.isArray(raw.bulls) ? raw.bulls.slice(0, 3) : [],
      bears: Array.isArray(raw.bears) ? raw.bears.slice(0, 3) : [],
      fairValue: (fvLow !== null && fvMid !== null && fvHigh !== null)
        ? { low: fvLow, mid: fvMid, high: fvHigh, basis: raw.fair_value_basis ?? '' }
        : null,
      tradingAdvice: (raw.trading_summary && raw.trading_if_holding && raw.trading_if_entering)
        ? { summary: raw.trading_summary, ifHolding: raw.trading_if_holding, ifEntering: raw.trading_if_entering }
        : null,
    };
    memCache.set(p.symbol, result);
    saveLS(p.symbol, result);
    return result;
  } catch { return null; }
}
