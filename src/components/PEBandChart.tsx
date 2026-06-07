import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, ReferenceArea, Tooltip } from 'recharts';
import type { OHLCV } from '../types/stock';

interface Props {
  ohlcv: OHLCV[];
  trailingEps: number;
  currentPrice: number;
  epsHistory?: { year: number; value: number }[];
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// Pick the EPS most likely in use on a given date using annual history.
// Annual reports typically become public ~Q1 of the following year.
function epsAtDate(
  dateStr: string,
  history: { year: number; value: number }[],
  fallback: number,
): number {
  if (!history.length) return fallback;
  const year = parseInt(dateStr.slice(0, 4));
  const month = parseInt(dateStr.slice(5, 7));
  // Before April: prior year's report not yet out → use two years back
  const targetYear = month >= 4 ? year - 1 : year - 2;
  const valid = history.filter(e => e.value > 0 && e.year <= targetYear + 1);
  if (!valid.length) return fallback;
  valid.sort((a, b) => b.year - a.year);
  return valid[0].value;
}

export function PEBandChart({ ohlcv, trailingEps, currentPrice, epsHistory = [] }: Props) {
  if (!trailingEps || trailingEps <= 0 || ohlcv.length < 20) {
    return (
      <div className="flex items-center justify-center h-20 text-slate-600 text-sm">
        EPS 資料不足，無法繪製本益比河流圖
      </div>
    );
  }

  // Compute per-bar EPS and implied PE
  const barsWithPE = ohlcv.map(d => {
    const eps = epsAtDate(d.date, epsHistory, trailingEps);
    return { date: d.date, close: d.close, eps, pe: eps > 0 ? d.close / eps : null };
  });

  const validPEs = barsWithPE.map(b => b.pe).filter((v): v is number => v !== null && isFinite(v));
  if (!validPEs.length) {
    return (
      <div className="flex items-center justify-center h-20 text-slate-600 text-sm">
        無法計算本益比（EPS 為負或資料不足）
      </div>
    );
  }

  const peP10 = percentile(validPEs, 10);
  const peP25 = percentile(validPEs, 25);
  const peP50 = percentile(validPEs, 50);
  const peP75 = percentile(validPEs, 75);
  const peP90 = percentile(validPEs, 90);

  // For band price levels we use trailing EPS (constant), so bands are horizontal
  const toPrice = (pe: number) => +(trailingEps * pe).toFixed(2);
  const priceP10 = toPrice(peP10);
  const priceP25 = toPrice(peP25);
  const priceP50 = toPrice(peP50);
  const priceP75 = toPrice(peP75);
  const priceP90 = toPrice(peP90);

  const currentPE = trailingEps > 0 ? +(currentPrice / trailingEps).toFixed(1) : null;

  let peZone = '合理';
  let peZoneColor = '#22c55e';
  if (currentPE !== null) {
    if (currentPE < peP25)      { peZone = '低估';   peZoneColor = '#3b82f6'; }
    else if (currentPE < peP50) { peZone = '合理偏低'; peZoneColor = '#22c55e'; }
    else if (currentPE < peP75) { peZone = '合理偏高'; peZoneColor = '#eab308'; }
    else                        { peZone = '高估';   peZoneColor = '#ef4444'; }
  }

  const closes = ohlcv.map(d => d.close);
  const yMin = Math.min(...closes) * 0.95;
  const yMax = Math.max(...closes) * 1.05;

  const data = ohlcv.map(d => ({
    date: d.date.slice(5),
    close: +d.close.toFixed(2),
    _eps: epsAtDate(d.date, epsHistory, trailingEps),
  }));

  const tickStyle = { fontSize: 9, fill: '#475569' };
  const interval = Math.floor(data.length / 6);
  const fmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0);

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-2">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block bg-blue-500/20" />
          低估 (&lt;{peP25.toFixed(1)}x)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block bg-emerald-500/15" />
          合理偏低 ({peP25.toFixed(1)}–{peP50.toFixed(1)}x)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block bg-yellow-500/15" />
          合理偏高 ({peP50.toFixed(1)}–{peP75.toFixed(1)}x)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block bg-red-500/15" />
          高估 (&gt;{peP75.toFixed(1)}x)
        </span>
        {currentPE !== null && (
          <span className="ml-auto text-slate-400">
            目前&nbsp;
            <strong style={{ color: peZoneColor }}>{currentPE}x</strong>
            <span className="ml-1 text-slate-600">({peZone})</span>
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
          <XAxis dataKey="date" tick={tickStyle} interval={interval} />
          <YAxis domain={[yMin, yMax]} tick={tickStyle} width={44} tickFormatter={fmt} />

          {/* Coloured band zones */}
          <ReferenceArea y1={yMin}      y2={priceP25} fill="rgba(59,130,246,0.12)"  ifOverflow="extendDomain" />
          <ReferenceArea y1={priceP25}  y2={priceP50} fill="rgba(34,197,94,0.10)"   ifOverflow="extendDomain" />
          <ReferenceArea y1={priceP50}  y2={priceP75} fill="rgba(234,179,8,0.09)"   ifOverflow="extendDomain" />
          <ReferenceArea y1={priceP75}  y2={yMax}     fill="rgba(239,68,68,0.11)"   ifOverflow="extendDomain" />

          {/* PE band lines */}
          <ReferenceLine y={priceP10} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={0.8} strokeOpacity={0.5}
            label={{ value: `${peP10.toFixed(1)}x`, fontSize: 8, fill: '#475569', position: 'insideTopRight' }} />
          <ReferenceLine y={priceP25} stroke="#3b82f6" strokeDasharray="4 2" strokeWidth={1} strokeOpacity={0.8}
            label={{ value: `P25 ${peP25.toFixed(1)}x`, fontSize: 9, fill: '#3b82f6', position: 'insideTopRight' }} />
          <ReferenceLine y={priceP50} stroke="#22c55e" strokeDasharray="4 2" strokeWidth={1} strokeOpacity={0.8}
            label={{ value: `中位 ${peP50.toFixed(1)}x`, fontSize: 9, fill: '#22c55e', position: 'insideTopRight' }} />
          <ReferenceLine y={priceP75} stroke="#eab308" strokeDasharray="4 2" strokeWidth={1} strokeOpacity={0.8}
            label={{ value: `P75 ${peP75.toFixed(1)}x`, fontSize: 9, fill: '#eab308', position: 'insideTopRight' }} />
          <ReferenceLine y={priceP90} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={0.8} strokeOpacity={0.5}
            label={{ value: `${peP90.toFixed(1)}x`, fontSize: 8, fill: '#ef4444', position: 'insideTopRight' }} />

          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)', backgroundColor: '#0c1628', color: '#cbd5e1' }}
            formatter={(v: any, _: any, props: any) => {
              const eps = props?.payload?._eps ?? trailingEps;
              const pe = eps > 0 ? (v / eps).toFixed(1) : '—';
              return [`${v}（PE: ${pe}x）`, '收盤價'];
            }}
            labelFormatter={(l: any) => `日期 ${l}`}
          />

          <Line type="monotone" dataKey="close" stroke="#e2e8f0" strokeWidth={1.5}
            dot={false} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-[10px] text-slate-700 mt-1 text-right">
        PE 區間基於近期歷史分位數（P10–P90），帶狀以當前 EPS {trailingEps.toFixed(2)} 計算
      </p>
    </div>
  );
}
