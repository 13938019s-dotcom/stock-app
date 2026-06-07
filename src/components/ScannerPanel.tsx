import { useState, useEffect } from 'react';
import type { WatchItem } from '../hooks/useWatchlist';
import { fetchPriceData } from '../services/yahooFinance';
import { fetchTWRatios } from '../services/twseApi';
import { fetchMonthRevenue } from '../services/twseRevenue';
import { calcAllIndicators } from '../utils/indicators';
import { calcGrahamFairValue } from '../utils/fundamentals';
import type { Indicators, OHLCV } from '../types/stock';

// ── condition definitions ──────────────────────────────────────────────────

interface CondDef {
  id: string;
  label: string;
  desc: string;
  category: '技術面' | '基本面' | '月營收';
  threshold?: { label: string; default: number; unit: string; dir: 'lt' | 'gt' };
  defaultOn: boolean;
  nullHint?: string;
}

const CONDS: CondDef[] = [
  // 技術面
  { id: 'above_ma20',      label: '站上 MA20',          desc: '股價高於 20 日均線',                  category: '技術面', defaultOn: true  },
  { id: 'above_ma60',      label: '站上 MA60（季線）',   desc: '股價高於 60 日均線（多頭格局）',       category: '技術面', defaultOn: false },
  { id: 'macd_cross',      label: 'MACD 黃金交叉',       desc: '近 5 日 MACD 線向上穿越 Signal',       category: '技術面', defaultOn: true  },
  { id: 'macd_above_zero', label: 'MACD 零軸之上',       desc: 'MACD 柱狀體 > 0，大趨勢偏多',          category: '技術面', defaultOn: false },
  { id: 'kd_cross',        label: 'KD 黃金交叉',         desc: '近 5 日 K 向上穿越 D',                 category: '技術面', defaultOn: false },
  { id: 'kd_low',          label: 'KD 超賣',             desc: 'K 值低於門檻，股價超賣',               category: '技術面', defaultOn: false,
    threshold: { label: 'K <', default: 20, unit: '', dir: 'lt' } },
  { id: 'rsi_low',         label: 'RSI 超賣',            desc: 'RSI 低於門檻，可能反彈',               category: '技術面', defaultOn: false,
    threshold: { label: 'RSI <', default: 40, unit: '', dir: 'lt' } },
  { id: 'rsi_high',        label: 'RSI 過熱',            desc: 'RSI 高於門檻，可能過熱',               category: '技術面', defaultOn: false,
    threshold: { label: 'RSI >', default: 80, unit: '', dir: 'gt' } },
  { id: 'bb_lower_touch',  label: '觸布林下軌',           desc: '股價貼近或跌破布林通道下軌（2% 容差）', category: '技術面', defaultOn: false },
  { id: 'vol_expansion',   label: '量能放大',             desc: '近 3 日均量 > N 倍 20 日均量',          category: '技術面', defaultOn: false,
    threshold: { label: '倍率 >', default: 1.5, unit: '倍', dir: 'gt' },
    nullHint: '需 ≥ 25 日資料' },

  // 基本面
  { id: 'pe_low',          label: '本益比偏低',           desc: 'PE 低於門檻',                          category: '基本面', defaultOn: true,
    threshold: { label: 'PE <', default: 20, unit: '倍', dir: 'lt' } },
  { id: 'peg_low',         label: 'PEG 偏低',             desc: 'PE ÷ 月營收年增率 < 門檻（近似 PEG）', category: '基本面', defaultOn: false,
    threshold: { label: 'PEG <', default: 1.5, unit: '', dir: 'lt' },
    nullHint: '需台股月營收年增率 > 0' },
  { id: 'pb_low',          label: 'PB 偏低',              desc: '股價淨值比低於門檻',                   category: '基本面', defaultOn: false,
    threshold: { label: 'PB <', default: 1.5, unit: '倍', dir: 'lt' } },
  { id: 'yield_high',      label: '殖利率佳',             desc: '配息殖利率高於門檻',                   category: '基本面', defaultOn: false,
    threshold: { label: '殖利率 >', default: 3, unit: '%', dir: 'gt' } },
  { id: 'payout_ok',       label: '發放率合理',            desc: '盈餘發放率介於 50~80%（殖利率 × PE）',  category: '基本面', defaultOn: false,
    nullHint: '需殖利率與 PE > 0 資料' },
  { id: 'eps_positive',    label: 'EPS 為正',             desc: '公司目前有獲利（PE > 0）',              category: '基本面', defaultOn: false },
  { id: 'below_graham',    label: '低於 Graham 合理價',   desc: '股價低於 Graham 公式估算（g=10%）',     category: '基本面', defaultOn: false,
    nullHint: '需 PE > 0 資料' },

  // 月營收
  { id: 'revenue_yoy',     label: '月營收年增',            desc: '最新月營收年增率高於門檻（台股）',      category: '月營收', defaultOn: false,
    threshold: { label: '年增率 >', default: 5, unit: '%', dir: 'gt' },
    nullHint: '需台股月營收資料' },
];

// ── strategy presets ───────────────────────────────────────────────────────

interface Strategy {
  id: string; label: string; icon: string; desc: string;
  conditions: string[]; thresholds: Record<string, number>; minPass: number;
  message: string;
  clr: { border: string; text: string; bg: string; msgBg: string };
}

const STRATEGIES: Strategy[] = [
  {
    id: 'bargain', label: '安心撿便宜', icon: '💰',
    desc: 'PE < 15 + KD 超賣',
    conditions: ['pe_low', 'kd_low'],
    thresholds: { pe_low: 15, kd_low: 20 },
    minPass: 2,
    message: '這張股票現在很便宜且跌深了，可以考慮分批佈局。',
    clr: { border: 'border-blue-700/50', text: 'text-blue-300', bg: 'bg-blue-950/30', msgBg: 'bg-blue-950/40 border-blue-800/30 text-blue-300' },
  },
  {
    id: 'strong', label: '強勢追蹤', icon: '🚀',
    desc: '站上 MA20 + EPS 為正',
    conditions: ['above_ma20', 'eps_positive'],
    thresholds: {},
    minPass: 2,
    message: '趨勢已轉強，公司也真的有賺錢，適合順勢操作。',
    clr: { border: 'border-emerald-700/50', text: 'text-emerald-300', bg: 'bg-emerald-950/30', msgBg: 'bg-emerald-950/40 border-emerald-800/30 text-emerald-300' },
  },
  {
    id: 'danger', label: '危險預警', icon: '⚠️',
    desc: 'RSI 過熱（> 80）',
    conditions: ['rsi_high'],
    thresholds: { rsi_high: 80 },
    minPass: 1,
    message: '目前過熱且財務出現隱憂，建議先停利減碼。',
    clr: { border: 'border-red-700/50', text: 'text-red-300', bg: 'bg-red-950/30', msgBg: 'bg-red-950/40 border-red-800/30 text-red-300' },
  },
  {
    id: 'garp', label: '價值成長 GARP', icon: '📈',
    desc: 'PEG < 1.5 + 站上季線 + EPS 為正',
    conditions: ['peg_low', 'above_ma60', 'eps_positive'],
    thresholds: { peg_low: 1.5 },
    minPass: 3,
    message: '成長性足以支撐目前股價，季線多頭確認，符合「以合理價買成長股」的 GARP 邏輯。',
    clr: { border: 'border-purple-700/50', text: 'text-purple-300', bg: 'bg-purple-950/30', msgBg: 'bg-purple-950/40 border-purple-800/30 text-purple-300' },
  },
  {
    id: 'contrarian', label: '逆向抄底', icon: '🎯',
    desc: 'RSI < 25 + 觸布林下軌 + PB 偏低',
    conditions: ['rsi_low', 'bb_lower_touch', 'pb_low'],
    thresholds: { rsi_low: 25, pb_low: 1.5 },
    minPass: 2,
    message: '市場極度恐慌、股價跌破價值區，符合景氣循環低檔逆向進場邏輯。',
    clr: { border: 'border-orange-700/50', text: 'text-orange-300', bg: 'bg-orange-950/30', msgBg: 'bg-orange-950/40 border-orange-800/30 text-orange-300' },
  },
  {
    id: 'triple', label: '三重過濾', icon: '🔍',
    desc: 'MACD > 零軸（大趨勢多）+ KD 黃金交叉',
    conditions: ['macd_above_zero', 'kd_cross'],
    thresholds: {},
    minPass: 2,
    message: '大趨勢多頭確認，日線 KD 低位交叉，符合 Elder 三重過濾進場訊號。',
    clr: { border: 'border-indigo-700/50', text: 'text-indigo-300', bg: 'bg-indigo-950/30', msgBg: 'bg-indigo-950/40 border-indigo-800/30 text-indigo-300' },
  },
  {
    id: 'dividend', label: '存股現金流', icon: '💵',
    desc: '殖利率 > 5% + 發放率 50~80% + EPS 為正',
    conditions: ['yield_high', 'payout_ok', 'eps_positive'],
    thresholds: { yield_high: 5 },
    minPass: 3,
    message: '高殖利率且發放率健康，公司持續獲利，適合長期存股打造現金流。',
    clr: { border: 'border-teal-700/50', text: 'text-teal-300', bg: 'bg-teal-950/30', msgBg: 'bg-teal-950/40 border-teal-800/30 text-teal-300' },
  },
];

// ── types ──────────────────────────────────────────────────────────────────

interface CondResult { pass: boolean | null; value?: string }

interface StockResult {
  symbol: string; name: string; displayCode: string; price: number;
  results: Record<string, CondResult>; passCount: number;
  loading: boolean; error: boolean;
}

// ── helpers ────────────────────────────────────────────────────────────────

function n(v: number, dec = 1) {
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(dec);
}

function detectGoldenCross(
  fast: (number | null)[] | number[],
  slow: (number | null)[] | number[],
  lookback: number,
): boolean | null {
  const len = Math.min(fast.length, slow.length);
  if (len < 2) return null;
  for (let i = Math.max(1, len - lookback); i < len; i++) {
    const f0 = fast[i - 1] as number | null, f1 = fast[i] as number | null;
    const s0 = slow[i - 1] as number | null, s1 = slow[i] as number | null;
    if (f0 !== null && s0 !== null && f1 !== null && s1 !== null) {
      if (f0 < s0 && f1 >= s1) return true;
    }
  }
  return false;
}

function evalCondition(
  id: string, price: number, ind: Indicators | null,
  twse: any, revenues: any[], thresholds: Record<string, number>,
  ohlcv: OHLCV[],
): CondResult {
  switch (id) {
    case 'above_ma20': {
      if (!ind) return { pass: null };
      const last = [...ind.ma20].reverse().find(v => v !== null) ?? null;
      return { pass: last !== null ? price > last : null, value: last !== null ? `MA20:${n(last)}` : undefined };
    }
    case 'above_ma60': {
      if (!ind) return { pass: null };
      const last = [...ind.ma60].reverse().find(v => v !== null) ?? null;
      return { pass: last !== null ? price > last : null, value: last !== null ? `MA60:${n(last)}` : undefined };
    }
    case 'macd_cross':
      return { pass: ind ? detectGoldenCross(ind.macdLine, ind.macdSignal, 5) : null };
    case 'macd_above_zero': {
      if (!ind) return { pass: null };
      const hist = [...ind.macdHistogram].reverse().find(v => v !== null) ?? null;
      if (hist === null) return { pass: null };
      return { pass: hist > 0, value: (hist >= 0 ? '+' : '') + hist.toFixed(2) };
    }
    case 'kd_cross':
      return { pass: ind ? detectGoldenCross(ind.kdK, ind.kdD, 5) : null };
    case 'kd_low': {
      if (!ind) return { pass: null };
      const k = ind.kdK[ind.kdK.length - 1] ?? null;
      return { pass: k !== null ? k < thresholds['kd_low'] : null, value: k !== null ? `K:${n(k)}` : undefined };
    }
    case 'rsi_low': {
      if (!ind) return { pass: null };
      const r = [...ind.rsi].reverse().find(v => v !== null) ?? null;
      return { pass: r !== null ? r < thresholds['rsi_low'] : null, value: r !== null ? `RSI:${n(r)}` : undefined };
    }
    case 'rsi_high': {
      if (!ind) return { pass: null };
      const r = [...ind.rsi].reverse().find(v => v !== null) ?? null;
      return { pass: r !== null ? r > thresholds['rsi_high'] : null, value: r !== null ? `RSI:${n(r)}` : undefined };
    }
    case 'bb_lower_touch': {
      if (!ind) return { pass: null };
      const lower = [...ind.bollingerLower].reverse().find(v => v !== null) ?? null;
      return { pass: lower !== null ? price <= lower * 1.02 : null, value: lower !== null ? `下軌:${n(lower)}` : undefined };
    }
    case 'vol_expansion': {
      if (ohlcv.length < 25) return { pass: null };
      const recent3 = ohlcv.slice(-3).reduce((s, d) => s + d.volume, 0) / 3;
      const avg20 = ohlcv.slice(-23, -3).reduce((s, d) => s + d.volume, 0) / 20;
      if (avg20 <= 0) return { pass: null };
      const ratio = recent3 / avg20;
      return { pass: ratio > thresholds['vol_expansion'], value: `${ratio.toFixed(1)}×` };
    }
    case 'pe_low': {
      const pe = twse?.pe ?? null;
      return { pass: pe !== null && pe > 0 ? pe < thresholds['pe_low'] : null, value: pe !== null && pe > 0 ? `PE:${n(pe)}` : undefined };
    }
    case 'peg_low': {
      const pe = twse?.pe ?? null;
      if (!pe || pe <= 0) return { pass: null };
      const last = revenues[revenues.length - 1];
      if (!last?.yoyGrowth || last.yoyGrowth <= 0) return { pass: null };
      const peg = pe / last.yoyGrowth;
      return { pass: peg < thresholds['peg_low'], value: `PEG:${peg.toFixed(2)}` };
    }
    case 'pb_low': {
      const pb = twse?.pbr ?? null;
      return { pass: pb !== null && pb > 0 ? pb < thresholds['pb_low'] : null, value: pb !== null && pb > 0 ? `PB:${pb.toFixed(2)}` : undefined };
    }
    case 'yield_high': {
      const dy = twse?.dividendYield ?? null;
      return { pass: dy !== null ? dy > thresholds['yield_high'] : null, value: dy !== null ? `${dy.toFixed(1)}%` : undefined };
    }
    case 'payout_ok': {
      const pe = twse?.pe ?? null;
      const dy = twse?.dividendYield ?? null;
      if (!pe || pe <= 0 || !dy || dy <= 0) return { pass: null };
      const payout = dy * pe / 100;
      return { pass: payout >= 50 && payout <= 80, value: `${payout.toFixed(0)}%` };
    }
    case 'eps_positive': {
      const pe = twse?.pe ?? null;
      return { pass: pe !== null ? pe > 0 : null };
    }
    case 'below_graham': {
      const pe = twse?.pe ?? null;
      if (!pe || pe <= 0 || price <= 0) return { pass: null };
      const grahamResult = calcGrahamFairValue(price / pe, 10);
      if (!grahamResult) return { pass: null };
      return { pass: price < grahamResult.price, value: `合理:${n(grahamResult.price)}` };
    }
    case 'revenue_yoy': {
      const last = revenues[revenues.length - 1];
      if (last?.yoyGrowth == null) return { pass: null };
      return { pass: last.yoyGrowth > thresholds['revenue_yoy'], value: `${last.yoyGrowth >= 0 ? '+' : ''}${last.yoyGrowth.toFixed(1)}%` };
    }
    default: return { pass: null };
  }
}

// ── styles ─────────────────────────────────────────────────────────────────

const badgeCls = (pass: boolean | null) =>
  pass === true  ? 'bg-emerald-900/50 text-emerald-300 border-emerald-800/40' :
  pass === false ? 'bg-slate-800/40 text-slate-600 border-slate-700/30' :
                   'bg-slate-800/30 text-slate-700 border-slate-800/20';

const CATEGORY_COLORS: Record<string, string> = {
  '技術面': 'text-blue-400', '基本面': 'text-amber-400', '月營收': 'text-emerald-400',
};

const INPUT_CLS = 'w-14 text-center bg-slate-800/70 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-blue-600';

const BATCH = 3;

// ── component ──────────────────────────────────────────────────────────────

interface SavedConfig {
  name: string;
  enabled: string[];
  thresholds: Record<string, number>;
  minPass: number;
}

interface ScannerPanelProps {
  watchlist: WatchItem[];
  onSelectStock?: (symbol: string) => void;
}

export function ScannerPanel({ watchlist, onSelectStock }: ScannerPanelProps) {
  const [enabled, setEnabled] = useState<Set<string>>(
    new Set(CONDS.filter(c => c.defaultOn).map(c => c.id))
  );
  const [thresholds, setThresholds] = useState<Record<string, number>>(
    Object.fromEntries(CONDS.filter(c => c.threshold).map(c => [c.id, c.threshold!.default]))
  );
  const [minPass, setMinPass] = useState(2);
  const [activeStrategy, setActiveStrategy] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<StockResult[]>([]);
  const [done, setDone] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>(() => {
    try { return JSON.parse(localStorage.getItem('stockiq_scan_configs') ?? '[]'); }
    catch { return []; }
  });
  const [configName, setConfigName] = useState('');

  useEffect(() => {
    localStorage.setItem('stockiq_scan_configs', JSON.stringify(savedConfigs));
  }, [savedConfigs]);

  const saveConfig = () => {
    const name = configName.trim();
    if (!name) return;
    setSavedConfigs(prev => [...prev.filter(c => c.name !== name), { name, enabled: [...enabled], thresholds: { ...thresholds }, minPass }]);
    setConfigName('');
  };

  const loadConfig = (cfg: SavedConfig) => {
    setEnabled(new Set(cfg.enabled));
    setThresholds(cfg.thresholds);
    setMinPass(cfg.minPass);
    setActiveStrategy(null);
    setResults([]); setDone(false);
  };

  const deleteConfig = (name: string) => setSavedConfigs(prev => prev.filter(c => c.name !== name));

  const enabledList = CONDS.filter(c => enabled.has(c.id));

  const toggle = (id: string) => {
    setActiveStrategy(null);
    setEnabled(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const applyStrategy = (s: Strategy) => {
    if (activeStrategy === s.id) {
      setActiveStrategy(null);
      setEnabled(new Set(CONDS.filter(c => c.defaultOn).map(c => c.id)));
      setThresholds(Object.fromEntries(CONDS.filter(c => c.threshold).map(c => [c.id, c.threshold!.default])));
      setMinPass(2);
    } else {
      setActiveStrategy(s.id);
      setEnabled(new Set(s.conditions));
      setThresholds(prev => ({ ...prev, ...s.thresholds }));
      setMinPass(s.minPass);
      setResults([]); setDone(false);
    }
  };

  const startScan = async () => {
    if (watchlist.length === 0 || enabledList.length === 0) return;
    setScanning(true); setDone(false); setProgress(0);

    // Show all as loading immediately
    setResults(watchlist.map(item => ({
      symbol: item.symbol, name: item.name, displayCode: item.displayCode,
      price: 0, results: {}, passCount: 0, loading: true, error: false,
    })));

    let completed = 0;

    for (let i = 0; i < watchlist.length; i += BATCH) {
      const batch = watchlist.slice(i, i + BATCH);
      await Promise.all(batch.map(async (item) => {
        try {
          const isTW = /^\d{4,6}/.test(item.displayCode);
          const [priceR, twseR, revR] = await Promise.allSettled([
            fetchPriceData(item.symbol),
            fetchTWRatios(item.symbol),
            isTW ? fetchMonthRevenue(item.displayCode) : Promise.resolve([]),
          ]);

          const price = priceR.status === 'fulfilled' ? priceR.value.info.currentPrice : 0;
          const ohlcv = priceR.status === 'fulfilled' ? priceR.value.ohlcv : [];
          const ind = ohlcv.length > 0 ? calcAllIndicators(ohlcv) : null;
          const twse = twseR.status === 'fulfilled' ? twseR.value : null;
          const revs = revR.status === 'fulfilled' ? revR.value : [];

          const condResults: Record<string, CondResult> = {};
          for (const c of enabledList) {
            condResults[c.id] = evalCondition(c.id, price, ind, twse, revs as any[], thresholds, ohlcv);
          }
          const passCount = Object.values(condResults).filter(r => r.pass === true).length;

          setResults(prev => prev.map(r =>
            r.symbol === item.symbol
              ? { ...r, price, results: condResults, passCount, loading: false }
              : r
          ));
        } catch {
          setResults(prev => prev.map(r =>
            r.symbol === item.symbol ? { ...r, loading: false, error: true } : r
          ));
        }
        completed++;
        setProgress(completed);
      }));
    }
    setScanning(false); setDone(true);
  };

  const matching = results.filter(r => !r.loading && !r.error && r.passCount >= minPass)
    .sort((a, b) => b.passCount - a.passCount);
  const strategy = STRATEGIES.find(s => s.id === activeStrategy) ?? null;
  const categories = ['技術面', '基本面', '月營收'] as const;

  return (
    <div className="space-y-4">
      {/* Settings card */}
      <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <h3 className="font-semibold text-slate-200 mb-4">條件篩選器</h3>

        {/* Strategy presets */}
        <div className="mb-5">
          <div className="text-xs text-slate-500 mb-2">快捷策略（點一下自動設定條件）</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {STRATEGIES.map(s => (
              <button
                key={s.id}
                onClick={() => applyStrategy(s)}
                className={`rounded-lg px-3 py-2.5 border text-left transition-all ${
                  activeStrategy === s.id
                    ? `${s.clr.border} ${s.clr.bg}`
                    : 'border-slate-700/40 bg-slate-800/30 hover:border-slate-600/60 hover:bg-slate-800/60'
                }`}
              >
                <div className={`text-xs font-semibold mb-0.5 ${activeStrategy === s.id ? s.clr.text : 'text-slate-300'}`}>
                  {s.icon} {s.label}
                </div>
                <div className="text-[11px] text-slate-600 leading-tight">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Conditions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          {categories.map(cat => (
            <div key={cat}>
              <div className={`text-xs font-semibold mb-2 ${CATEGORY_COLORS[cat]}`}>{cat}</div>
              <div className="space-y-2">
                {CONDS.filter(c => c.category === cat).map(c => (
                  <label key={c.id} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="mt-0.5 accent-blue-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium ${enabled.has(c.id) ? 'text-slate-200' : 'text-slate-600'}`}>
                          {c.label}
                        </span>
                        {c.threshold && enabled.has(c.id) && (
                          <div className="flex items-center gap-1 text-slate-500 text-xs">
                            <span>{c.threshold.label}</span>
                            <input
                              type="number"
                              value={thresholds[c.id]}
                              onChange={e => setThresholds(p => ({ ...p, [c.id]: Number(e.target.value) }))}
                              onClick={e => e.stopPropagation()}
                              className={INPUT_CLS}
                            />
                            <span>{c.threshold.unit}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 leading-tight">{c.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 flex-wrap border-t border-slate-700/30 pt-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>最少符合</span>
            <input
              type="number" min={1} max={enabledList.length || 1}
              value={minPass}
              onChange={e => setMinPass(Math.max(1, Number(e.target.value)))}
              className={INPUT_CLS}
            />
            <span>項才顯示</span>
          </div>
          <button
            onClick={startScan}
            disabled={scanning || watchlist.length === 0 || enabledList.length === 0}
            className="ml-auto px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {scanning ? `掃描中 ${progress}/${watchlist.length}…` : `▶ 掃描 ${watchlist.length} 支自選股`}
          </button>
        </div>

        {scanning && (
          <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(progress / watchlist.length) * 100}%` }} />
          </div>
        )}

        {/* Config save/load */}
        <div className="mt-4 pt-3 border-t border-slate-700/30">
          <div className="text-xs text-slate-500 mb-2">📁 儲存掃描配置</div>
          {savedConfigs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {savedConfigs.map(cfg => (
                <div key={cfg.name} className="flex items-center gap-0.5 bg-slate-800/60 border border-slate-700/30 rounded-full pl-2.5 pr-1 py-0.5">
                  <button onClick={() => loadConfig(cfg)} className="text-xs text-slate-300 hover:text-blue-300 transition-colors font-medium">
                    {cfg.name}
                  </button>
                  <button
                    onClick={() => deleteConfig(cfg.name)}
                    className="w-4 h-4 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-900/30 transition-colors text-xs ml-0.5"
                    title="刪除"
                  >×</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              value={configName}
              onChange={e => setConfigName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveConfig(); }}
              placeholder="輸入配置名稱後儲存…"
              className="flex-1 bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-600 transition-colors"
            />
            <button
              onClick={saveConfig}
              disabled={!configName.trim()}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 hover:text-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              儲存
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {(results.length > 0 || done) && (
        <div className="space-y-3">
          {results.filter(r => r.loading).map(r => (
            <div key={r.symbol} className="bg-[#0c1628] rounded-xl border border-slate-700/40 px-5 py-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-4 w-24 bg-slate-800 rounded" />
                <div className="h-3 w-10 bg-slate-800/60 rounded ml-1" />
              </div>
            </div>
          ))}

          {done && matching.length === 0 && (
            <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 px-5 py-4 text-sm text-slate-500 text-center">
              沒有股票符合條件（最少 {minPass} 項）
            </div>
          )}

          {matching.length > 0 && (
            <>
              <div className={`text-xs font-semibold px-1 ${strategy ? strategy.clr.text : 'text-emerald-400'}`}>
                {strategy ? `${strategy.icon} ${strategy.label}` : '✅'} 符合條件（{matching.length} / {results.filter(r => !r.loading && !r.error).length} 支）
              </div>
              {matching.map(r => (
                <ResultCard key={r.symbol} result={r} enabledList={enabledList} strategy={strategy} onSelectStock={onSelectStock} />
              ))}
            </>
          )}
        </div>
      )}

      {watchlist.length === 0 && (
        <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 px-5 py-6 text-center text-slate-500 text-sm">
          自選清單為空，請先在「個股分析」頁面加入自選股
        </div>
      )}
    </div>
  );
}

function ResultCard({ result: r, enabledList, strategy, onSelectStock }: {
  result: StockResult; enabledList: CondDef[]; strategy: Strategy | null;
  onSelectStock?: (symbol: string) => void;
}) {
  const total = enabledList.length;
  const pct = total > 0 ? (r.passCount / total) * 100 : 0;
  const barColor = strategy
    ? (r.passCount >= total ? strategy.clr.text.replace('text-', 'bg-') : 'bg-slate-600')
    : r.passCount >= total * 0.8 ? 'bg-emerald-500' : r.passCount >= total * 0.5 ? 'bg-amber-500' : 'bg-slate-600';
  const borderCls = strategy ? strategy.clr.border : r.passCount > 0 ? 'border-emerald-900/40' : 'border-slate-700/30';

  return (
    <div className={`bg-[#0c1628] rounded-xl border px-5 py-3.5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] ${borderCls}`}>
      {/* Header row — clickable to open stock */}
      <div className="flex items-center gap-3 mb-2.5">
        <div
          onClick={() => onSelectStock?.(r.symbol)}
          className={`flex items-center gap-1 min-w-0 ${onSelectStock ? 'cursor-pointer group' : ''}`}
        >
          <span className={`font-semibold text-sm ${onSelectStock ? 'text-slate-200 group-hover:text-blue-300 transition-colors' : 'text-slate-200'}`}>
            {r.name}
          </span>
          <span className="text-slate-600 text-xs">{r.displayCode}</span>
          {onSelectStock && (
            <span className="text-[10px] text-slate-700 group-hover:text-blue-500 transition-colors ml-0.5">↗</span>
          )}
        </div>
        {r.price > 0 && (
          <span className="text-slate-400 text-sm ml-auto tabular-nums">{r.price.toLocaleString()}</span>
        )}
        <span className={`text-xs font-semibold tabular-nums ${strategy ? strategy.clr.text : r.passCount >= total * 0.8 ? 'text-emerald-400' : r.passCount >= total * 0.5 ? 'text-amber-400' : 'text-slate-500'}`}>
          {r.passCount}/{total}
        </span>
      </div>

      <div className="h-1 bg-slate-800 rounded-full mb-2.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {enabledList.map(c => {
          const res = r.results[c.id];
          const pass = res?.pass ?? null;
          return (
            <span key={c.id} className={`text-[11px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${badgeCls(pass)}`}>
              {pass === true && <span>✓</span>}
              <span>{c.label}</span>
              {res?.value && <span className="opacity-50 font-mono">{res.value}</span>}
              {pass === null && c.nullHint && (
                <span className="text-slate-700 cursor-help" title={c.nullHint}>ⓘ</span>
              )}
            </span>
          );
        })}
      </div>

      {/* Strategy message */}
      {strategy && r.passCount >= total && (
        <div className={`mt-3 text-xs px-3 py-2 rounded-lg border leading-relaxed ${strategy.clr.msgBg}`}>
          {strategy.message}
        </div>
      )}
    </div>
  );
}
