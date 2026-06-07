import { useState } from 'react';
import type { FundamentalData } from '../types/stock';
import type { CompanyInsight } from '../services/geminiAnalysis';
import {
  calcYieldFairValue,
  calcPEFairValue,
  calcGrahamFairValue,
  calcEpsGrowthRate,
} from '../utils/fundamentals';

interface Props {
  fundamentals: FundamentalData | null;
  currentPrice: number;
  currentPE?: number | null;
  insight?: CompanyInsight | null;
  insightLoading?: boolean;
}

type PriceTag = '偏便宜' | '合理區間' | '偏貴' | null;

function priceTag(price: number, low: number, high: number): PriceTag {
  if (price <= 0) return null;
  if (price < low) return '偏便宜';
  if (price > high) return '偏貴';
  return '合理區間';
}

function tagStyle(tag: PriceTag) {
  if (tag === '偏便宜') return 'bg-blue-950/60 border-blue-800/40 text-blue-300';
  if (tag === '偏貴')   return 'bg-red-950/60 border-red-800/40 text-red-300';
  if (tag === '合理區間') return 'bg-emerald-950/60 border-emerald-800/40 text-emerald-300';
  return 'bg-slate-800/60 border-slate-700/40 text-slate-400';
}

function PriceBar({ price, low, high }: { price: number; low: number; high: number }) {
  const min = low * 0.6;
  const max = high * 1.4;
  const range = max - min;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / range) * 100));
  return (
    <div className="relative h-2 bg-slate-800 rounded-full mt-2 mb-1">
      {/* fair range */}
      <div
        className="absolute top-0 h-full bg-emerald-900/60 rounded-full"
        style={{ left: `${pct(low)}%`, width: `${pct(high) - pct(low)}%` }}
      />
      {/* current price marker */}
      {price > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]"
          style={{ left: `calc(${pct(price)}% - 5px)` }}
        />
      )}
    </div>
  );
}

export function FairValuePanel({ fundamentals, currentPrice, currentPE, insight, insightLoading }: Props) {
  const [open, setOpen] = useState(true);
  const [yieldLow, setYieldLow] = useState(3);
  const [yieldHigh, setYieldHigh] = useState(5);
  const [refPE, setRefPE] = useState(15);
  const [growthInput, setGrowthInput] = useState<number | null>(null);

  const eps = fundamentals?.trailingEps ?? fundamentals?.eps[0]?.value ?? null;
  const div = fundamentals?.dividendRate ?? null;
  const autoGrowth = fundamentals ? calcEpsGrowthRate(fundamentals.eps) : null;
  const growth = growthInput ?? (autoGrowth !== null ? Math.round(autoGrowth) : 10);
  const pe = fundamentals?.pe ?? currentPE ?? null;

  const hasAnyData = eps !== null || div !== null;

  const yieldFV = div ? calcYieldFairValue(div, yieldLow, yieldHigh) : null;
  const peFV = eps ? calcPEFairValue(eps, refPE) : null;
  const grahamFV = eps ? calcGrahamFairValue(eps, growth) : null;

  // Consensus: average of available midpoints
  const midpoints = [
    yieldFV ? (yieldFV.lowPrice + yieldFV.highPrice) / 2 : null,
    peFV ? peFV.price : null,
    grahamFV ? grahamFV.price : null,
  ].filter((v): v is number => v !== null);
  const consensus = midpoints.length > 0 ? midpoints.reduce((a, b) => a + b) / midpoints.length : null;

  const INPUT = 'w-16 border border-slate-700 bg-slate-800/70 text-slate-200 rounded px-2 py-0.5 text-center text-sm focus:outline-none focus:border-blue-600';

  return (
    <div className="bg-[#0c1628] rounded-xl border border-slate-700/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setOpen(v => !v)}>
        <h3 className="font-semibold text-slate-200">合理價評估</h3>
        <div className="flex items-center gap-2">
          {consensus !== null && currentPrice > 0 && (
            <>
              <span className="text-xs text-slate-500">三法均值</span>
              <span className="text-sm font-bold text-blue-300 tabular-nums">{consensus.toFixed(1)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tagStyle(priceTag(currentPrice, consensus * 0.9, consensus * 1.1))}`}>
                {priceTag(currentPrice, consensus * 0.9, consensus * 1.1) ?? '—'}
              </span>
            </>
          )}
          <span className={`text-slate-500 text-sm transition-transform duration-200 ${open ? '' : '-rotate-90'}`}>▾</span>
        </div>
      </div>

      {open && !hasAnyData && (
        <p className="text-xs text-slate-600 bg-slate-800/40 rounded-lg px-4 py-3 border border-slate-700/30">
          目前無法取得 EPS 與配息資料（可能為非上市/上櫃股票，或該股本益比為負）。美股請確認輸入正確代碼；台股請確認為上市或上櫃股票。
        </p>
      )}

      {open && <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">

        {/* 1. 殖利率回推法 */}
        <div className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4 space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-base">💰</span>
            <span className="text-xs font-semibold text-slate-300">殖利率回推法</span>
          </div>
          <p className="text-[11px] text-slate-600">FV = 年配息 ÷ 目標殖利率</p>
          {div ? (
            <>
              <div className="text-xs text-slate-500">年配息 <span className="text-slate-300 font-mono">{div.toFixed(2)}</span> 元</div>
              <div className="flex items-center gap-1 text-xs text-slate-500 flex-wrap">
                目標
                <input type="number" value={yieldLow} min={1} max={20} step={0.5}
                  onChange={e => setYieldLow(Number(e.target.value))} className={INPUT} />
                %～
                <input type="number" value={yieldHigh} min={1} max={20} step={0.5}
                  onChange={e => setYieldHigh(Number(e.target.value))} className={INPUT} />
                %
              </div>
              {yieldFV && (
                <>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-bold text-white tabular-nums">
                      {yieldFV.lowPrice.toFixed(0)}
                    </span>
                    <span className="text-slate-600">～</span>
                    <span className="text-lg font-bold text-white tabular-nums">
                      {yieldFV.highPrice.toFixed(0)}
                    </span>
                    <span className="text-xs text-slate-500">元</span>
                  </div>
                  <PriceBar price={currentPrice} low={yieldFV.lowPrice} high={yieldFV.highPrice} />
                  {currentPrice > 0 && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${tagStyle(priceTag(currentPrice, yieldFV.lowPrice, yieldFV.highPrice))}`}>
                      {priceTag(currentPrice, yieldFV.lowPrice, yieldFV.highPrice)}
                    </span>
                  )}
                </>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-600">無配息資料</p>
          )}
        </div>

        {/* 2. 本益比法 */}
        <div className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4 space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-base">📊</span>
            <span className="text-xs font-semibold text-slate-300">本益比法</span>
          </div>
          <p className="text-[11px] text-slate-600">FV = EPS × 參考 PE</p>
          {eps ? (
            <>
              <div className="text-xs text-slate-500">EPS <span className="text-slate-300 font-mono">{eps.toFixed(2)}</span> 元 ／ 現 PE {pe?.toFixed(1) ?? '—'}</div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                參考 PE
                <input type="number" value={refPE} min={5} max={50} step={1}
                  onChange={e => setRefPE(Number(e.target.value))} className={INPUT} />
                倍
              </div>
              {peFV && (
                <>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-bold text-white tabular-nums">
                      {peFV.price.toFixed(0)}
                    </span>
                    <span className="text-xs text-slate-500">元</span>
                  </div>
                  <PriceBar price={currentPrice} low={peFV.price * 0.85} high={peFV.price * 1.15} />
                  {currentPrice > 0 && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${tagStyle(priceTag(currentPrice, peFV.price * 0.85, peFV.price * 1.15))}`}>
                      {priceTag(currentPrice, peFV.price * 0.85, peFV.price * 1.15)}
                    </span>
                  )}
                </>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-600">無 EPS 資料</p>
          )}
        </div>

        {/* 3. Graham 公式 */}
        <div className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4 space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-base">📐</span>
            <span className="text-xs font-semibold text-slate-300">Graham 公式</span>
          </div>
          <p className="text-[11px] text-slate-600">FV = EPS × (8.5 + 2g)</p>
          {eps ? (
            <>
              <div className="text-xs text-slate-500">
                EPS <span className="text-slate-300 font-mono">{eps.toFixed(2)}</span> 元
                {autoGrowth !== null && <span className="ml-1">(歷史成長 {autoGrowth.toFixed(1)}%)</span>}
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                預期成長
                <input type="number" value={growth} min={-20} max={50} step={1}
                  onChange={e => setGrowthInput(Number(e.target.value))} className={INPUT} />
                %/年
              </div>
              {grahamFV && (
                <>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-bold text-white tabular-nums">
                      {grahamFV.price.toFixed(0)}
                    </span>
                    <span className="text-xs text-slate-500">元</span>
                  </div>
                  <PriceBar price={currentPrice} low={grahamFV.price * 0.85} high={grahamFV.price * 1.15} />
                  {currentPrice > 0 && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${tagStyle(priceTag(currentPrice, grahamFV.price * 0.85, grahamFV.price * 1.15))}`}>
                      {priceTag(currentPrice, grahamFV.price * 0.85, grahamFV.price * 1.15)}
                    </span>
                  )}
                </>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-600">無 EPS 資料</p>
          )}
        </div>

        {/* 4. AI 合理價 */}
        <div className="bg-slate-800/40 rounded-lg border border-purple-900/30 p-4 space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-base">✦</span>
            <span className="text-xs font-semibold text-purple-300">AI 合理價</span>
          </div>
          <p className="text-[11px] text-slate-600">AI 依產業慣例與財務數據估算</p>

          {insightLoading && (
            <div className="space-y-1.5 pt-1">
              {[70, 50, 80].map((w, i) => (
                <div key={i} className="h-3 rounded bg-slate-700 animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}

          {!insightLoading && insight === undefined && (
            <p className="text-xs text-slate-600">產生 AI 洞察後自動顯示</p>
          )}

          {!insightLoading && insight === null && (
            <p className="text-xs text-slate-600">尚未產生 AI 洞察，請點上方「✦ 產生 AI 投資洞察」</p>
          )}

          {!insightLoading && insight != null && !insight.fairValue && (
            <p className="text-xs text-slate-600">AI 未能估算此股（可重新分析）</p>
          )}

          {!insightLoading && insight?.fairValue && (() => {
            const fv = insight.fairValue!;
            return (
              <>
                <div className="space-y-1 text-xs mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-10">保守</span>
                    <span className="text-slate-200 font-mono font-semibold">{fv.low.toLocaleString()}</span>
                    <span className="text-slate-600 text-[10px]">元</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-10">中立</span>
                    <span className="text-white font-mono font-bold text-base">{fv.mid.toLocaleString()}</span>
                    <span className="text-slate-600 text-[10px]">元</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-10">樂觀</span>
                    <span className="text-slate-200 font-mono font-semibold">{fv.high.toLocaleString()}</span>
                    <span className="text-slate-600 text-[10px]">元</span>
                  </div>
                </div>
                <PriceBar price={currentPrice} low={fv.low} high={fv.high} />
                {currentPrice > 0 && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${tagStyle(priceTag(currentPrice, fv.low, fv.high))}`}>
                    {priceTag(currentPrice, fv.low, fv.high)}
                  </span>
                )}
                {fv.basis && <p className="text-[10px] text-slate-600 leading-relaxed pt-1">{fv.basis}</p>}
              </>
            );
          })()}
        </div>

      </div>}

      {open && <p className="text-[11px] text-slate-700 leading-relaxed">
        ⚠️ 合理價為參考估算，各方法假設不同。殖利率法適合配息穩定股；本益比法需搭配產業 PE 判斷；Graham 公式適合成長股。台股 EPS 與殖利率資料來源：證交所（TWSE）／ 櫃買中心（TPEX）開放資料，以當日本益比估算，僅供參考。
      </p>}
    </div>
  );
}
