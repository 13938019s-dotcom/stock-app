import { useState, useEffect } from 'react';
import type { WatchItem } from '../hooks/useWatchlist';
import { fetchNewsForSymbol, isWithin3Days, formatNewsTime } from '../services/yahooNews';
import type { NewsItem } from '../services/yahooNews';
import { fetchGoogleNewsForSymbol } from '../services/googleNews';
import { useNewsRead } from '../hooks/useNewsRead';
import { getNewsSummary } from '../services/geminiNews';
import type { AISummary } from '../services/geminiNews';

interface Props {
  watchlist: WatchItem[];
  onUnreadCountChange?: (count: number) => void;
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
      <polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

function NewsRow({ news, isRead, onRead }: { news: NewsItem; isRead: boolean; onRead: (id: string) => void }) {
  return (
    <a
      href={news.link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onRead(news.uuid)}
      className={`flex items-start gap-2.5 px-4 py-3 hover:bg-slate-800/50 transition-colors group ${isRead ? 'opacity-55' : ''}`}
    >
      <div className="flex-shrink-0 mt-1.5">
        {!isRead
          ? <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]" />
          : <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug group-hover:text-blue-300 transition-colors line-clamp-2 ${isRead ? 'text-slate-500' : 'text-slate-200'}`}>
          {news.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600">
          <span>{news.publisher}</span>
          <span>·</span>
          <span>{formatNewsTime(news.providerPublishTime)}</span>
          {isWithin3Days(news.providerPublishTime) && !isRead && (
            <span className="text-blue-500 font-medium">NEW</span>
          )}
        </div>
      </div>
      <div className="text-slate-700 group-hover:text-blue-400 transition-colors mt-0.5">
        <ExternalIcon />
      </div>
    </a>
  );
}

function AISummaryBlock({ summary, loading }: { summary: AISummary | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="px-4 py-3 border-b border-slate-700/40 space-y-2">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[10px] font-bold text-purple-400 bg-purple-900/30 border border-purple-700/30 rounded-full px-2 py-0.5">AI 觀點</span>
          <span className="text-[10px] text-slate-600 animate-pulse">分析中…</span>
        </div>
        <div className="h-3 bg-slate-800 rounded animate-pulse w-full" />
        <div className="h-3 bg-slate-800 rounded animate-pulse w-4/5" />
        <div className="h-3 bg-slate-800 rounded animate-pulse w-3/5 mt-1" />
      </div>
    );
  }
  if (!summary) return null;
  return (
    <div className="px-4 py-3 border-b border-slate-700/40 bg-purple-950/10">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[10px] font-bold text-purple-400 bg-purple-900/30 border border-purple-700/30 rounded-full px-2 py-0.5">AI 觀點</span>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed mb-2">{summary.paragraph}</p>
      <ul className="space-y-1">
        {summary.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
            <span className="text-purple-500 mt-0.5 flex-shrink-0">▸</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StockNewsCard({
  stock, news, isRead, onRead, expanded, onToggleExpand,
}: {
  stock: WatchItem;
  news: NewsItem[];
  isRead: (id: string) => boolean;
  onRead: (id: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (news.length === 0) return;
    let cancelled = false;
    setAiSummary(null);
    setAiLoading(true);
    getNewsSummary(stock.name, stock.symbol, news.map(n => n.title)).then(result => {
      if (cancelled) return;
      setAiSummary(result);
      setAiLoading(false);
    });
    return () => { cancelled = true; };
  }, [stock.symbol, news.map(n => n.uuid).join(',')]);

  const unreadCount = news.filter(n => !isRead(n.uuid)).length;
  const displayed = expanded ? news : news.slice(0, 3);
  const hasMore = news.length > 3;

  return (
    <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200 text-sm">{stock.name}</span>
          <span className="text-xs text-slate-600 font-mono">{stock.symbol.replace(/\.TWO?$/i, '')}</span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">
              {unreadCount} 未讀
            </span>
          )}
        </div>
        <span className="text-xs text-slate-600">{news.length} 則</span>
      </div>

      {/* AI summary */}
      <AISummaryBlock summary={aiSummary} loading={aiLoading} />

      {/* News rows */}
      <div className="divide-y divide-slate-800/50">
        {displayed.map(n => (
          <NewsRow key={n.uuid} news={n} isRead={isRead(n.uuid)} onRead={onRead} />
        ))}
      </div>

      {/* Expand / collapse */}
      {hasMore && (
        <button
          onClick={onToggleExpand}
          className="w-full px-4 py-2 text-xs text-slate-500 hover:text-blue-400 hover:bg-slate-800/40 transition-colors border-t border-slate-800/60 text-center"
        >
          {expanded ? '收起' : `顯示全部 ${news.length} 則`}
        </button>
      )}
    </div>
  );
}

export function NewsPanel({ watchlist, onUnreadCountChange }: Props) {
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSymbol, setActiveSymbol] = useState<string>('all');
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const { isRead, markRead, markAllRead } = useNewsRead();

  useEffect(() => {
    if (watchlist.length === 0) return;
    let cancelled = false;
    setLoading(true);
    setAllNews([]);

    Promise.all(
      watchlist.map(item =>
        /\.TWO?$/i.test(item.symbol) || /^\d{4,6}$/.test(item.symbol)
          ? fetchGoogleNewsForSymbol(item.symbol, item.name)
          : fetchNewsForSymbol(item.symbol, item.name)
      )
    ).then(results => {
      if (cancelled) return;
      const merged = results
        .flat()
        .filter((n, i, arr) => arr.findIndex(x => x.uuid === n.uuid) === i)
        .sort((a, b) => b.providerPublishTime - a.providerPublishTime);
      setAllNews(merged);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [watchlist.map(w => w.symbol + w.name).join(','), refreshKey]);

  const recentAll = allNews.filter(n => isWithin3Days(n.providerPublishTime));
  const totalUnread = recentAll.filter(n => !isRead(n.uuid)).length;

  useEffect(() => {
    onUnreadCountChange?.(totalUnread);
  }, [totalUnread]);

  const toggleExpand = (symbol: string) => {
    setExpandedSymbols(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol); else next.add(symbol);
      return next;
    });
  };

  const allUnreadIds = recentAll.filter(n => !isRead(n.uuid)).map(n => n.uuid);

  if (watchlist.length === 0) {
    return (
      <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 p-10 text-center shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <p className="text-slate-500 text-sm">尚無自選股</p>
        <p className="text-slate-600 text-xs mt-1">先在「個股分析」加入自選股，再回來查看新聞</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveSymbol('all')}
            className={`text-xs px-3 py-1 rounded-full border transition-all font-medium ${
              activeSymbol === 'all'
                ? 'bg-gradient-to-b from-blue-500 to-blue-700 border-blue-400/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                : 'bg-slate-800/60 border-slate-700/30 text-slate-400 hover:text-slate-200'
            }`}
          >
            全部
            {totalUnread > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1.5 font-bold">{totalUnread}</span>
            )}
          </button>
          {watchlist.map(item => {
            const symUnread = recentAll.filter(n => n.symbol === item.symbol && !isRead(n.uuid)).length;
            const isActive = activeSymbol === item.symbol;
            return (
              <button
                key={item.symbol}
                onClick={() => setActiveSymbol(item.symbol)}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                  isActive
                    ? 'bg-gradient-to-b from-blue-500 to-blue-700 border-blue-400/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                    : 'bg-slate-800/60 border-slate-700/30 text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.name}
                {symUnread > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1.5 font-bold">{symUnread}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          {allUnreadIds.length > 0 && (
            <button
              onClick={() => markAllRead(allUnreadIds)}
              className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
            >
              全部標為已讀
            </button>
          )}
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            disabled={loading}
            className="text-xs text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-1 disabled:opacity-40"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={loading ? 'animate-spin' : ''}>
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            更新
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <p className="text-slate-500 text-sm animate-pulse">載入新聞中…</p>
        </div>
      )}

      {!loading && (
        <>
          {activeSymbol === 'all' ? (
            /* ── 全部模式：每支股票一張卡片 ── */
            watchlist.map(item => {
              const stockNews = allNews.filter(n => n.symbol === item.symbol);
              if (stockNews.length === 0) return null;
              return (
                <StockNewsCard
                  key={item.symbol}
                  stock={item}
                  news={stockNews}
                  isRead={isRead}
                  onRead={markRead}
                  expanded={expandedSymbols.has(item.symbol)}
                  onToggleExpand={() => toggleExpand(item.symbol)}
                />
              );
            })
          ) : (
            /* ── 單股模式：單張卡片顯示全部新聞 ── */
            (() => {
              const item = watchlist.find(w => w.symbol === activeSymbol);
              const stockNews = allNews.filter(n => n.symbol === activeSymbol);
              if (!item || stockNews.length === 0) {
                return (
                  <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
                    <p className="text-slate-500 text-sm">目前無新聞</p>
                  </div>
                );
              }
              return (
                <StockNewsCard
                  stock={item}
                  news={stockNews}
                  isRead={isRead}
                  onRead={markRead}
                  expanded={true}
                  onToggleExpand={() => {}}
                />
              );
            })()
          )}

          {!loading && activeSymbol === 'all' && watchlist.every(item => allNews.filter(n => n.symbol === item.symbol).length === 0) && (
            <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <p className="text-slate-500 text-sm">目前無新聞</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
