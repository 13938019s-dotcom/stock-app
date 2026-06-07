import { useState, useEffect, useRef } from 'react';
import { fetchPriceData, fetchOHLCV } from './services/yahooFinance';
import { fetchTWRatios, getTWChineseName } from './services/twseApi';
import { calcAllIndicators, calcFibonacci } from './utils/indicators';
import { detectSignals } from './utils/signals';
import { checkFundamentals } from './utils/fundamentals';
import { calcRecommendation } from './utils/recommendation';
import { SearchBar } from './components/SearchBar';
import { StockHeader } from './components/StockHeader';
import { FundamentalPanel } from './components/FundamentalPanel';
import { SignalPanel } from './components/SignalPanel';
import { RecommendationPanel } from './components/RecommendationPanel';
import { WatchlistPanel } from './components/WatchlistPanel';
import { MainChart } from './components/MainChart';
import { MACDChart } from './components/MACDChart';
import { KDRSIChart } from './components/KDRSIChart';
import { PEBandChart } from './components/PEBandChart';
import { RevenueChart } from './components/RevenueChart';
import { fetchMonthRevenue } from './services/twseRevenue';
import type { MonthRevenue } from './services/twseRevenue';
import { InfoModal, InfoButton } from './components/InfoModal';
import { CollapsibleCard } from './components/CollapsibleCard';
import { getCompanyInsight, clearInsightCache } from './services/geminiAnalysis';
import type { CompanyInsight } from './services/geminiAnalysis';
import type { InsightParams } from './components/RecommendationPanel';
import { MarketOverview } from './components/MarketOverview';
import { IndexBar } from './components/IndexBar';
import { ScannerPanel } from './components/ScannerPanel';
import { FairValuePanel } from './components/FairValuePanel';
import { StockNewsSection } from './components/StockNewsSection';
import { NewsPanel } from './components/NewsPanel';
import { useWatchlist } from './hooks/useWatchlist';
import { useAlerts } from './hooks/useAlerts';
import { useAlertPoller } from './hooks/useAlertPoller';
import type { StockInfo, OHLCV, Indicators, TechnicalSignal, FundamentalCheck, FundamentalData } from './types/stock';
import type { Recommendation } from './utils/recommendation';

type Tab = 'stock' | 'market' | 'news' | 'scanner';

const CARD = 'bg-[#0c1628] rounded-xl border border-slate-700/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]';

function buildSupportLevels(price: number, ohlcv: OHLCV[], ind: Indicators | null) {
  if (!ind || ohlcv.length === 0 || price <= 0) return [];
  const { levels: fibs } = calcFibonacci(ohlcv);
  const last = ohlcv.length - 1;
  const entries: { label: string; price: number; pct: number }[] = [];
  for (const fib of fibs) {
    if (fib.price < price * 0.997 && fib.ratio > 0 && fib.ratio < 1) {
      const label = fib.ratio === 0.618 ? 'Fib 61.8% ★' : `Fib ${(fib.ratio * 100).toFixed(1)}%`;
      entries.push({ label, price: fib.price, pct: ((fib.price - price) / price) * 100 });
    }
  }
  const ma20v = ind.ma20[last], ma60v = ind.ma60[last], bollLow = ind.bollingerLower[last];
  if (ma20v !== null && ma20v < price * 0.997) entries.push({ label: 'MA20', price: ma20v, pct: ((ma20v - price) / price) * 100 });
  if (ma60v !== null && ma60v < price * 0.997) entries.push({ label: 'MA60', price: ma60v, pct: ((ma60v - price) / price) * 100 });
  if (bollLow !== null && bollLow < price * 0.997) entries.push({ label: '布林下軌', price: bollLow, pct: ((bollLow - price) / price) * 100 });
  entries.sort((a, b) => b.price - a.price);
  return entries.filter((e, i) => !entries.slice(0, i).some(p => Math.abs(p.price - e.price) / e.price < 0.025)).slice(0, 4);
}

export default function App() {
  const watchlist = useWatchlist();
  const alerts = useAlerts();
  const [tab, setTab] = useState<Tab>('market');
  const [priceLoading, setPriceLoading] = useState(false);
  const [fundLoading, setFundLoading] = useState(false);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [ohlcv, setOhlcv] = useState<OHLCV[]>([]);
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [signals, setSignals] = useState<TechnicalSignal[]>([]);
  const [fundamentalChecks, setFundamentalChecks] = useState<FundamentalCheck[]>([]);
  const [fundamentalData, setFundamentalData] = useState<FundamentalData | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartPeriod, setChartPeriod] = useState<'1mo' | '6mo' | '1y' | '5y' | 'max'>('1y');
  const [chartLoading, setChartLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mktLoading, setMktLoading] = useState(false);
  const [mktError, setMktError] = useState<string | null>(null);
  const [mktSymbol, setMktSymbol] = useState('^TWII');
  const [mktOhlcv, setMktOhlcv] = useState<OHLCV[]>([]);
  const [mktIndicators, setMktIndicators] = useState<Indicators | null>(null);
  const [mktInfo, setMktInfo] = useState<StockInfo | null>(null);
  const [infoModal, setInfoModal] = useState<'macd' | 'peband' | null>(null);
  const [showMACDCross, setShowMACDCross] = useState(false);
  const [showKDCross, setShowKDCross] = useState(false);
  const [revenueData, setRevenueData] = useState<MonthRevenue[]>([]);
  const [insight, setInsight] = useState<CompanyInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightFailed, setInsightFailed] = useState(false);
  const [autoInsight, setAutoInsight] = useState(() => localStorage.getItem('stockiq_auto_insight') === 'true');
  const autoInsightRef = useRef(autoInsight);
  useEffect(() => { autoInsightRef.current = autoInsight; }, [autoInsight]);
  const searchRef = useRef<HTMLInputElement>(null);
  const toggleAutoInsight = () => {
    setAutoInsight(prev => {
      const next = !prev;
      localStorage.setItem('stockiq_auto_insight', String(next));
      return next;
    });
  };

  const loadMarket = async (sym: string) => {
    setTab('market');
    setMktLoading(true);
    setMktSymbol(sym);
    setMktError(null);
    setError(null);
    try {
      const { info, ohlcv: data } = await fetchPriceData(sym);
      const ind = calcAllIndicators(data);
      setMktOhlcv(data);
      setMktIndicators(ind);
      setMktInfo(info);
    } catch (e) {
      setMktError(e instanceof Error ? e.message : '大盤資料載入失敗');
    } finally {
      setMktLoading(false);
    }
  };

  const loadStock = async (symbol: string) => {
    const isIndex = symbol.trim().startsWith('^');

    if (isIndex) {
      loadMarket(symbol.trim());
      return;
    }

    localStorage.setItem('stockiq_last_symbol', symbol.trim());
    setTab('stock');
    setChartPeriod('1y');
    setPriceLoading(true);
    setFundLoading(true);
    setError(null);
    setFundamentalChecks([]);
    setFundamentalData(null);
    setRecommendation(null);
    setRevenueData([]);
    setInsight(null);
    setInsightFailed(false);

    const isTWCode = /^\d{4,6}[A-Za-z]{0,2}$/.test(symbol.trim());
    if (isTWCode) {
      fetchMonthRevenue(symbol.trim())
        .then(d => setRevenueData(d))
        .catch(() => {});
    }

    const [priceResult, twseResult] = await Promise.allSettled([
      fetchPriceData(symbol),
      fetchTWRatios(symbol),
    ]);
    let currentInd: Indicators | null = null;
    let currentSigs: TechnicalSignal[] = [];
    let currentPrice = 0;

    if (priceResult.status === 'fulfilled') {
      const { info, ohlcv: data } = priceResult.value;
      currentPrice = info.currentPrice;
      currentInd = calcAllIndicators(data);
      currentSigs = detectSignals(data, currentInd);
      setStockInfo(info);
      setOhlcv(data);
      setIndicators(currentInd);
      setSignals(currentSigs);
    } else {
      setError(priceResult.reason?.message ?? '無法載入價格資料');
    }
    setPriceLoading(false);

    // Build fundamental data, then enrich with official TWSE/TPEX ratios
    let enrichedChecks: FundamentalCheck[] = [];
    let finalFd: FundamentalData | null = null;
    {
      let fd: FundamentalData = { eps: [], roe: null, debtRatio: null, peg: null, fcf: null, trailingEps: null, pe: null, dividendRate: null, dividendYield: null, pbr: null };

      const twse = twseResult.status === 'fulfilled' ? twseResult.value : null;
      if (twse && currentPrice > 0) {
        if (fd.pe === null && twse.pe) fd = { ...fd, pe: twse.pe };
        if (fd.trailingEps === null && twse.pe && twse.pe > 0)
          fd = { ...fd, trailingEps: parseFloat((currentPrice / twse.pe).toFixed(2)) };
        if (fd.dividendRate === null) {
          if (twse.dividendPerShare && twse.dividendPerShare > 0)
            fd = { ...fd, dividendRate: twse.dividendPerShare };
          else if (twse.dividendYield && twse.dividendYield > 0)
            fd = { ...fd, dividendRate: parseFloat((currentPrice * twse.dividendYield / 100).toFixed(2)) };
        }
        if (twse.dividendYield) fd = { ...fd, dividendYield: twse.dividendYield };
        if (twse.pbr) fd = { ...fd, pbr: twse.pbr };
      }

      // Enrich stock info with Chinese name and industry from TWSE/TPEX
      {
        const ticker = priceResult.status === 'fulfilled' ? priceResult.value.info.symbol : null;
        const chineseName = twse?.chineseName ?? (ticker ? getTWChineseName(ticker) : null);
        if (chineseName && ticker) watchlist.updateName(ticker, chineseName);
        setStockInfo(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            name: chineseName ?? prev.name,
            industry: twse?.industry ?? prev.industry,
          };
        });
      }

      enrichedChecks = checkFundamentals(fd);
      setFundamentalData(fd);
      setFundamentalChecks(enrichedChecks);
      finalFd = fd;
    }
    setFundLoading(false);

    if (currentInd && priceResult.status === 'fulfilled') {
      const { ohlcv: data } = priceResult.value;
      const rec = calcRecommendation(data, currentInd, currentSigs, enrichedChecks);
      setRecommendation(rec);
    }

    if (autoInsightRef.current && priceResult.status === 'fulfilled' && finalFd) {
      const si = priceResult.value.info;
      const twseVal = twseResult.status === 'fulfilled' ? twseResult.value : null;
      const { ohlcv: data } = priceResult.value;
      const autoSupports = buildSupportLevels(si.currentPrice, data, currentInd);
      setInsightLoading(true);
      getCompanyInsight({
        symbol: si.symbol,
        name: twseVal?.chineseName ?? si.name,
        industry: twseVal?.industry ?? si.industry,
        price: si.currentPrice,
        currency: si.currency,
        pe: finalFd.pe,
        eps: finalFd.trailingEps,
        dividendYield: finalFd.dividendYield,
        pbr: finalFd.pbr,
        supportLevels: autoSupports,
      })
        .then(r => { setInsight(r); if (!r) setInsightFailed(true); })
        .catch(() => setInsightFailed(true))
        .finally(() => setInsightLoading(false));
    }
  };

  // Always-current refs for keyboard handler (avoids stale closures)
  const kbActionsRef = useRef({ loadMarket, mktOhlcvEmpty: true });
  kbActionsRef.current = { loadMarket, mktOhlcvEmpty: mktOhlcv.length === 0 };

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isTyping) return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === '1') {
        setTab('stock');
      } else if (e.key === '2') {
        setTab('market');
        if (kbActionsRef.current.mktOhlcvEmpty) kbActionsRef.current.loadMarket('^TWII');
      } else if (e.key === '3') {
        setTab('news');
      } else if (e.key === '4') {
        setTab('scanner');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Alert toast
  const [alertToast, setAlertToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setAlertToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setAlertToast(null), 6000);
  };

  useAlertPoller(alerts.items, (alertItem, direction, price) => {
    alerts.markFired(alertItem.symbol, direction);
    const sign = direction === 'high' ? '突破' : '跌破';
    const threshold = direction === 'high' ? alertItem.high! : alertItem.low!;
    const body = `${alertItem.name} ${sign} ${threshold}，現價 ${price.toFixed(direction === 'high' ? 1 : 2)}`;
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('📊 StockIQ 到價通知', { body, tag: `${alertItem.symbol}-${direction}` });
    }
    showToast(`🔔 ${body}`);
  });

  const handleSetAlert = async (symbol: string, name: string, high?: number, low?: number) => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    alerts.upsert(symbol, name, high, low);
  };

  const CHART_PERIODS = [
    { value: '1mo' as const, label: '1M', interval: '1d',  range: '1mo' },
    { value: '6mo' as const, label: '6M', interval: '1d',  range: '6mo' },
    { value: '1y'  as const, label: '1Y', interval: '1d',  range: '1y'  },
    { value: '5y'  as const, label: '5Y', interval: '1wk', range: '5y'  },
    { value: 'max' as const, label: 'MAX', interval: '1mo', range: '10y' },
  ];

  const reloadChart = async (symbol: string, period: typeof chartPeriod) => {
    const cfg = CHART_PERIODS.find(p => p.value === period)!;
    setChartLoading(true);
    try {
      const data = await fetchOHLCV(symbol, cfg.interval, cfg.range);
      const ind = calcAllIndicators(data);
      const sigs = detectSignals(data, ind);
      setOhlcv(data);
      setIndicators(ind);
      setSignals(sigs);
    } catch {
      // keep existing chart on error
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    loadMarket('^TWII');
    loadStock(localStorage.getItem('stockiq_last_symbol') ?? '2330');
  }, []);

  const loading = priceLoading;
  const fibLevels = ohlcv.length > 0 ? calcFibonacci(ohlcv).levels : [];
  const high52 = ohlcv.length > 0 ? Math.max(...ohlcv.map(d => d.high)) : undefined;
  const low52  = ohlcv.length > 0 ? Math.min(...ohlcv.map(d => d.low))  : undefined;

  const isInWatchlist = stockInfo ? watchlist.has(stockInfo.symbol) : false;

  const TAB_BTN = (active: boolean) =>
    `px-3 py-1 text-sm rounded-md transition-all font-medium ${
      active
        ? 'bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_14px_rgba(59,130,246,0.35)] border border-blue-400/20'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
    }`;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-[#060e1a]/90 border-b border-blue-900/20 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                📊 StockIQ
              </span>
              <span className="text-[10px] text-slate-600 tracking-wide">by zoezomi</span>
            </div>
            <div className="flex gap-0.5 bg-slate-800/60 rounded-lg p-0.5 border border-slate-700/30">
              <button onClick={() => setTab('stock')} className={TAB_BTN(tab === 'stock')}>
                個股分析
              </button>
              <button
                onClick={() => { setTab('market'); if (mktOhlcv.length === 0) loadMarket('^TWII'); }}
                className={TAB_BTN(tab === 'market')}
              >
                大盤總覽
              </button>
              <button
                onClick={() => setTab('news')}
                className={`${TAB_BTN(tab === 'news')} relative`}
              >
                自選新聞
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shadow-[0_0_6px_rgba(239,68,68,0.6)]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <button onClick={() => setTab('scanner')} className={TAB_BTN(tab === 'scanner')}>
                條件篩選
              </button>
            </div>
          </div>
          <SearchBar ref={searchRef} onSearch={loadStock} loading={loading || mktLoading} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {error && (
          <div className="bg-red-950/60 border border-red-800/50 rounded-xl px-5 py-3 text-sm text-red-300 flex items-center gap-2">
            <span>⚠️</span> {error}
            <span className="text-xs text-red-500 ml-2">（台股輸入代碼如 2330、00631L；美股輸入 AAPL；大盤輸入 ^TWII）</span>
          </div>
        )}

        {tab !== 'news' && tab !== 'scanner' && (
          <WatchlistPanel
            items={watchlist.items}
            currentSymbol={stockInfo?.symbol ?? ''}
            onSelect={loadStock}
            onRemove={watchlist.remove}
            onReorder={watchlist.reorder}
            onUpdateNote={watchlist.updateNote}
            getAlert={alerts.get}
            onSetAlert={handleSetAlert}
            onRemoveAlert={alerts.remove}
            onResetAlertFired={alerts.resetFired}
          />
        )}

        {/* 個股分析 */}
        {tab === 'stock' && (
          <>
            {priceLoading && (
              <div className={`${CARD} text-center text-slate-500 text-sm animate-pulse`}>
                正在載入股票資料…
              </div>
            )}

            {stockInfo && !priceLoading && (
              <div className="flex items-stretch gap-3">
                <div className="flex-1">
                  <StockHeader info={stockInfo} high52={high52} low52={low52} />
                </div>
                <button
                  onClick={() => isInWatchlist
                    ? watchlist.remove(stockInfo.symbol)
                    : watchlist.add(stockInfo.symbol, stockInfo.name)
                  }
                  className={`px-4 rounded-xl border text-sm font-medium transition-all flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] ${
                    isInWatchlist
                      ? 'bg-gradient-to-b from-amber-700/60 to-amber-900/60 border-amber-600/30 text-amber-300 hover:from-amber-600/60 hover:to-amber-800/60'
                      : 'bg-gradient-to-b from-slate-700/50 to-slate-800/50 border-slate-600/30 text-slate-400 hover:text-slate-200 hover:from-slate-600/50 hover:to-slate-700/50'
                  }`}
                >
                  {isInWatchlist ? '⭐ 已加入' : '☆ 加入自選'}
                </button>
              </div>
            )}

            {recommendation && stockInfo && (
              <RecommendationPanel
                rec={recommendation}
                stockName={stockInfo.name}
                insight={insight}
                insightLoading={insightLoading}
                insightFailed={insightFailed}
                autoInsight={autoInsight}
                onToggleAutoInsight={toggleAutoInsight}
                onRetryInsight={(params?: InsightParams) => {
                  clearInsightCache(stockInfo.symbol);
                  setInsight(null);
                  setInsightFailed(false);
                  setInsightLoading(true);
                  getCompanyInsight({
                    symbol: stockInfo.symbol,
                    name: stockInfo.name,
                    industry: stockInfo.industry,
                    price: stockInfo.currentPrice,
                    currency: stockInfo.currency,
                    pe: fundamentalData?.pe ?? null,
                    eps: fundamentalData?.trailingEps ?? null,
                    dividendYield: fundamentalData?.dividendYield ?? null,
                    pbr: fundamentalData?.pbr ?? null,
                    supportLevels: buildSupportLevels(stockInfo.currentPrice, ohlcv, indicators),
                    ...params,
                  })
                    .then(r => { setInsight(r); if (!r) setInsightFailed(true); })
                    .catch(() => setInsightFailed(true))
                    .finally(() => setInsightLoading(false));
                }}
              />
            )}

            <FundamentalPanel
              checks={fundamentalChecks}
              loading={fundLoading}
            />

            {!fundLoading && stockInfo && (
              <FairValuePanel
                fundamentals={fundamentalData}
                currentPrice={stockInfo.currentPrice}
                currentPE={fundamentalData?.pe ?? null}
                insight={insight}
                insightLoading={insightLoading}
              />
            )}

            {signals.length > 0 && <SignalPanel signals={signals} />}


            {ohlcv.length > 0 && indicators && (
              <>
                <div className={CARD}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-300 text-sm">
                      K 線 ＋ 均線 ＋ 布林通道
                      {chartLoading && <span className="ml-2 text-xs text-slate-600 animate-pulse">載入中…</span>}
                    </h3>
                    <div className="flex gap-0.5 bg-slate-800/60 rounded-lg p-0.5 border border-slate-700/30">
                      {CHART_PERIODS.map(p => (
                        <button
                          key={p.value}
                          disabled={chartLoading}
                          onClick={() => {
                            if (p.value === chartPeriod || !stockInfo) return;
                            setChartPeriod(p.value);
                            reloadChart(stockInfo.symbol, p.value);
                          }}
                          className={`px-3 py-0.5 text-xs rounded font-medium transition-all ${
                            chartPeriod === p.value
                              ? 'bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setShowMACDCross(v => !v)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-all font-medium ${
                        showMACDCross
                          ? 'border-[#34d399]/50 text-[#34d399] bg-[#34d399]/10'
                          : 'border-slate-700/40 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      ▲▼ MACD 訊號
                    </button>
                    <button
                      onClick={() => setShowKDCross(v => !v)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-all font-medium ${
                        showKDCross
                          ? 'border-[#818cf8]/50 text-[#818cf8] bg-[#818cf8]/10'
                          : 'border-slate-700/40 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      ▲▼ KD 訊號
                    </button>
                  </div>
                  <MainChart ohlcv={ohlcv} indicators={indicators} fibLevels={fibLevels} showFib={false} showMACDCross={showMACDCross} showKDCross={showKDCross} />
                </div>
                {fundamentalData?.trailingEps && fundamentalData.trailingEps > 0 && stockInfo && (
                  <CollapsibleCard
                    title={<h3 className="font-semibold text-slate-300 text-sm">本益比河流圖（PE Band）</h3>}
                    extra={<InfoButton onClick={() => setInfoModal('peband')} />}
                  >
                    <PEBandChart
                      ohlcv={ohlcv}
                      trailingEps={fundamentalData.trailingEps}
                      currentPrice={stockInfo.currentPrice}
                      epsHistory={fundamentalData.eps}
                    />
                  </CollapsibleCard>
                )}
                {revenueData.length > 0 && (
                  <CollapsibleCard title={<h3 className="font-semibold text-slate-300 text-sm">月營收趨勢</h3>}>
                    <RevenueChart data={revenueData} />
                  </CollapsibleCard>
                )}
                <CollapsibleCard
                  title={<h3 className="font-semibold text-slate-300 text-sm">MACD (12, 26, 9)</h3>}
                  extra={<InfoButton onClick={() => setInfoModal('macd')} />}
                >
                  <MACDChart ohlcv={ohlcv} indicators={indicators} />
                </CollapsibleCard>
                <CollapsibleCard title={<h3 className="font-semibold text-slate-300 text-sm">KD ＋ RSI ＋ 乖離率 BIAS</h3>}>
                  <KDRSIChart ohlcv={ohlcv} indicators={indicators} />
                </CollapsibleCard>

              </>
            )}

            {stockInfo && !priceLoading && (
              <StockNewsSection symbol={stockInfo.symbol} stockName={stockInfo.name} />
            )}
          </>
        )}

        {/* 大盤總覽 */}
        {tab === 'market' && (
          <>
            <IndexBar activeSymbol={mktSymbol} onSelect={loadMarket} />
            {mktError && (
              <div className="bg-red-950/60 border border-red-800/50 rounded-xl px-5 py-4 text-sm text-red-300 flex items-center justify-between">
                <span>⚠️ {mktError}</span>
                <button
                  onClick={() => loadMarket(mktSymbol)}
                  className="ml-4 px-3 py-1 text-xs rounded-lg bg-red-800/40 hover:bg-red-700/50 text-red-200 border border-red-700/40 transition-colors"
                >
                  重試
                </button>
              </div>
            )}
            {mktInfo && <StockHeader info={mktInfo} />}
            <MarketOverview ohlcv={mktOhlcv} indicators={mktIndicators!} loading={mktLoading} />
            {mktOhlcv.length > 0 && mktIndicators && (
              <>
                <div className={CARD}>
                  <h3 className="font-semibold text-slate-300 text-sm mb-3">MACD (12, 26, 9)</h3>
                  <MACDChart ohlcv={mktOhlcv} indicators={mktIndicators} />
                </div>
                <div className={CARD}>
                  <h3 className="font-semibold text-slate-300 text-sm mb-3">KD ＋ RSI ＋ 乖離率 BIAS</h3>
                  <KDRSIChart ohlcv={mktOhlcv} indicators={mktIndicators} />
                </div>
              </>
            )}
          </>
        )}

        {/* 自選新聞 */}
        {tab === 'news' && (
          <NewsPanel watchlist={watchlist.items} onUnreadCountChange={setUnreadCount} />
        )}

        {/* 條件篩選 */}
        {tab === 'scanner' && (
          <ScannerPanel
            watchlist={watchlist.items}
            onSelectStock={(sym) => { setTab('stock'); loadStock(sym); }}
          />
        )}
      </main>

      {/* Alert toast */}
      {alertToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-[#0c1628] border border-amber-600/40 shadow-[0_8px_32px_rgba(0,0,0,0.6)] rounded-xl px-5 py-3 text-sm text-amber-300 animate-in fade-in slide-in-from-bottom-2 duration-300"
          onClick={() => setAlertToast(null)}
        >
          <span>{alertToast}</span>
          <button className="text-slate-600 hover:text-slate-400 text-xs ml-1">×</button>
        </div>
      )}

      <footer className="text-center text-xs text-slate-700 py-6 space-y-1">
        <div>StockIQ — 僅供個人學習參考，不構成投資建議</div>
        <div className="text-slate-800">
          快捷鍵：<kbd className="font-mono">/</kbd> 搜尋　<kbd className="font-mono">1</kbd>–<kbd className="font-mono">4</kbd> 切換分頁
        </div>
      </footer>

      {/* ── MACD 說明 ── */}
      {infoModal === 'macd' && (
        <InfoModal title="MACD 指標說明（12, 26, 9）" onClose={() => setInfoModal(null)}>
          <div className="bg-blue-950/40 rounded-xl p-4 border border-blue-800/30 text-blue-300 text-xs leading-relaxed">
            MACD 衡量短期與長期均線的差距，用來判斷<strong className="text-blue-200">趨勢方向</strong>與<strong className="text-blue-200">動能強弱</strong>。
          </div>

          <div className="space-y-3">
            <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/30">
              <div className="text-slate-200 font-medium mb-1">📐 計算方式</div>
              <ul className="text-xs text-slate-400 space-y-1">
                <li><span className="text-blue-400">MACD 線</span> = EMA(12) − EMA(26)　短期均線減長期均線</li>
                <li><span className="text-red-400">Signal 線</span> = EMA(9) of MACD　MACD 的 9 日平滑</li>
                <li><span className="text-slate-300">柱狀圖</span> = MACD − Signal　兩線差距的視覺化</li>
              </ul>
            </div>

            <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/30">
              <div className="text-slate-200 font-medium mb-2">📖 如何判讀</div>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold mt-0.5">▲</span>
                  <div><span className="text-slate-200">黃金交叉</span>：MACD 線從下往上穿越 Signal 線 → 短期動能轉強，<span className="text-emerald-400">看多訊號</span></div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400 font-bold mt-0.5">▼</span>
                  <div><span className="text-slate-200">死亡交叉</span>：MACD 線從上往下穿越 Signal 線 → 動能轉弱，<span className="text-red-400">看空警訊</span></div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">◆</span>
                  <div><span className="text-slate-200">柱狀圖由負轉正</span>：賣壓轉買力，交叉確認更可信</div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">⚠</span>
                  <div><span className="text-slate-200">背離（Divergence）</span>：股價創新高但 MACD 沒有跟上 → 趨勢可能轉弱，需注意</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/30">
              <div className="text-slate-200 font-medium mb-1">⚡ MACD 零軸的意義</div>
              <div className="text-xs text-slate-400 space-y-1">
                <div>• MACD &gt; 0：短期均線在長期均線之上，屬<span className="text-emerald-400">多頭格局</span></div>
                <div>• MACD &lt; 0：短期均線在長期均線之下，屬<span className="text-red-400">空頭格局</span></div>
                <div>• 零軸附近交叉的訊號可信度更高</div>
              </div>
            </div>
          </div>

          <div className="bg-amber-950/40 rounded-xl p-3 border border-amber-800/30 text-amber-400 text-xs">
            ⚠ MACD 是<strong>落後指標</strong>，適合確認趨勢，不適合抓頭部/底部。建議搭配 KD 或 RSI 一起判斷。
          </div>
        </InfoModal>
      )}

      {/* ── PE Band 說明 ── */}
      {infoModal === 'peband' && (
        <InfoModal title="本益比河流圖（PE Band）說明" onClose={() => setInfoModal(null)}>
          <div className="bg-purple-950/40 rounded-xl p-4 border border-purple-800/30 text-purple-300 text-xs leading-relaxed">
            PE Band 把歷史本益比（PE）的分布畫成彩色帶狀，讓你直觀看出目前股價在<strong className="text-purple-200">歷史估值中的相對位置</strong>。
          </div>

          <div className="space-y-3">
            <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/30">
              <div className="text-slate-200 font-medium mb-2">📐 計算方式</div>
              <div className="text-xs text-slate-400 space-y-1">
                <div>每日隱含 PE = 收盤價 ÷ EPS（每股盈餘）</div>
                <div>取歷史 PE 的百分位數作為帶狀邊界：</div>
                <div className="mt-2 space-y-1 ml-2">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm inline-block bg-blue-500/30 flex-shrink-0" />P25 以下 → 低估區</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm inline-block bg-emerald-500/30 flex-shrink-0" />P25 ~ P50 → 合理偏低</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm inline-block bg-yellow-500/30 flex-shrink-0" />P50 ~ P75 → 合理偏高</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm inline-block bg-red-500/30 flex-shrink-0" />P75 以上 → 高估區</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/30">
              <div className="text-slate-200 font-medium mb-2">📖 如何判讀</div>
              <div className="text-xs text-slate-400 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">◆</span>
                  <div>股價落在<span className="text-blue-300">藍色區（低估）</span>：過去大多數時間比現在貴，相對便宜，長期買入勝算較高</div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">◆</span>
                  <div>股價在<span className="text-emerald-300">綠色區（合理偏低）</span>：接近歷史中位偏下，可分批布局</div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">◆</span>
                  <div>股價在<span className="text-yellow-300">黃色區（合理偏高）</span>：已在中位之上，追高需謹慎，可等回落</div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">◆</span>
                  <div>股價在<span className="text-red-300">紅色區（高估）</span>：歷史上只有 25% 的時間比現在貴，風險較高</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/30">
              <div className="text-slate-200 font-medium mb-1">⚠ 適用限制</div>
              <div className="text-xs text-slate-400 space-y-1">
                <div>• ETF 和虧損股（EPS &lt; 0）不適用此圖</div>
                <div>• PE Band 是<strong className="text-slate-300">相對估值</strong>，不代表絕對便宜或貴</div>
                <div>• 若公司獲利結構改變（如大幅成長/衰退），歷史 PE 帶參考意義降低</div>
                <div>• 建議搭配基本面篩選一起使用</div>
              </div>
            </div>
          </div>

          <div className="bg-amber-950/40 rounded-xl p-3 border border-amber-800/30 text-amber-400 text-xs">
            ⚠ 本圖以近期 Trailing EPS 計算，較適合觀察 1Y 以內的估值位置。長期圖（5Y/MAX）會嘗試使用年度 EPS 歷史補正，但仍為近似值。
          </div>
        </InfoModal>
      )}
    </div>
  );
}
