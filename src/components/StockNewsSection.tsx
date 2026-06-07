import { useState, useEffect } from 'react';
import { fetchNewsForSymbol, formatNewsTime, isWithin3Days } from '../services/yahooNews';
import type { NewsItem } from '../services/yahooNews';
import { getNewsSummary } from '../services/geminiNews';
import type { AISummary } from '../services/geminiNews';
import { CollapsibleCard } from './CollapsibleCard';

interface Props {
  symbol: string;
  stockName: string;
}

function ExternalIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 opacity-40">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
      <polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

export function StockNewsSection({ symbol, stockName }: Props) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setNews([]);
    setAiSummary(null);
    setLoading(true);
    setAiLoading(false);

    fetchNewsForSymbol(symbol, stockName)
      .then(items => {
        if (cancelled) return;
        const top = items.slice(0, 6);
        setNews(top);
        setLoading(false);
        if (top.length > 0) {
          setAiLoading(true);
          getNewsSummary(stockName, symbol, top.map(n => n.title)).then(s => {
            if (cancelled) return;
            setAiSummary(s);
            setAiLoading(false);
          });
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [symbol]);

  const title = (
    <h3 className="font-semibold text-slate-300 text-sm flex items-center gap-2">
      📰 最新新聞
      {loading && <span className="text-xs text-slate-600 font-normal animate-pulse">載入中…</span>}
      {!loading && news.length > 0 && <span className="text-xs text-slate-600 font-normal">{news.length} 則</span>}
    </h3>
  );

  return (
    <CollapsibleCard title={title} defaultOpen={false}>
      {/* AI summary */}
      {(aiLoading || aiSummary) && (
        <div className="mb-3 rounded-lg border border-purple-900/30 bg-purple-950/15 px-3 py-2.5">
          {aiLoading && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] font-bold text-purple-400 bg-purple-900/30 border border-purple-700/30 rounded-full px-2 py-0.5">AI 觀點</span>
                <span className="text-[10px] text-slate-600 animate-pulse">分析中…</span>
              </div>
              <div className="h-2.5 bg-slate-800 rounded animate-pulse w-full" />
              <div className="h-2.5 bg-slate-800 rounded animate-pulse w-4/5" />
            </div>
          )}
          {aiSummary && (
            <>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] font-bold text-purple-400 bg-purple-900/30 border border-purple-700/30 rounded-full px-2 py-0.5">AI 觀點</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-2">{aiSummary.paragraph}</p>
              <ul className="space-y-1">
                {aiSummary.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                    <span className="text-purple-500 mt-0.5 flex-shrink-0">▸</span>{b}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* No news */}
      {!loading && news.length === 0 && (
        <p className="text-xs text-slate-600">暫無相關新聞</p>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map(n => (
            <div key={n} className="animate-pulse space-y-1">
              <div className="h-3 bg-slate-800 rounded w-full" />
              <div className="h-2.5 bg-slate-800/60 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* News list */}
      {news.length > 0 && (
        <div className="divide-y divide-slate-800/50 -mx-5 mt-1">
          {news.map(n => (
            <a
              key={n.uuid}
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2.5 px-5 py-2.5 hover:bg-slate-800/40 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 leading-snug group-hover:text-blue-300 transition-colors line-clamp-2">
                  {n.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-600">
                  <span>{n.publisher}</span>
                  <span>·</span>
                  <span>{formatNewsTime(n.providerPublishTime)}</span>
                  {isWithin3Days(n.providerPublishTime) && (
                    <span className="text-blue-500 font-medium">NEW</span>
                  )}
                </div>
              </div>
              <div className="mt-0.5 text-slate-700 group-hover:text-blue-400 transition-colors">
                <ExternalIcon />
              </div>
            </a>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}
