import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip, ComposedChart } from 'recharts';
import type { OHLCV, Indicators } from '../types/stock';

interface Props {
  ohlcv: OHLCV[];
  indicators: Indicators;
}

const tooltipStyle = {
  contentStyle: {
    fontSize: 11, borderRadius: 8,
    border: '1px solid rgba(59,130,246,0.2)',
    backgroundColor: '#0c1628',
    color: '#cbd5e1',
  },
};

export function KDRSIChart({ ohlcv, indicators }: Props) {
  const start = Math.max(0, ohlcv.length - 120);

  const kdData = ohlcv.slice(start).map((d, ri) => {
    const i = start + ri;
    const k = indicators.kdK[i];
    const dd = indicators.kdD[i];
    return { date: d.date.slice(5), K: isNaN(k) ? null : +k.toFixed(1), D: isNaN(dd) ? null : +dd.toFixed(1) };
  });

  const rsiData = ohlcv.slice(start).map((d, ri) => {
    const i = start + ri;
    return { date: d.date.slice(5), RSI: indicators.rsi[i] !== null ? +indicators.rsi[i]!.toFixed(1) : null };
  });

  const biasData = ohlcv.slice(start).map((d, ri) => {
    const i = start + ri;
    return { date: d.date.slice(5), BIAS20: indicators.bias20[i], BIAS60: indicators.bias60[i] };
  });

  const tickStyle = { fontSize: 9, fill: '#475569' };

  return (
    <div className="space-y-4">
      {/* KD */}
      <div>
        <div className="flex gap-4 text-xs text-slate-600 mb-1">
          <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-amber-400 inline-block" />K</span>
          <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-blue-500 inline-block" />D</span>
          <span className="text-emerald-600">─ ─ 20 超賣</span>
          <span className="text-red-500/70">─ ─ 80 超買</span>
        </div>
        <ResponsiveContainer width="100%" height={90}>
          <LineChart data={kdData} margin={{ top: 2, right: 8, bottom: 0, left: 2 }}>
            <XAxis dataKey="date" tick={tickStyle} interval={Math.floor(kdData.length / 5)} />
            <YAxis domain={[0, 100]} ticks={[20, 50, 80]} tick={tickStyle} width={28} />
            <ReferenceLine y={20} stroke="#22c55e" strokeDasharray="4 2" strokeWidth={1} strokeOpacity={0.6} />
            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} strokeOpacity={0.6} />
            <Tooltip {...tooltipStyle} formatter={(v: any) => [(v as number)?.toFixed(1)]} labelFormatter={(l: any) => `日期 ${l}`} />
            <Line type="monotone" dataKey="K" stroke="#f59e0b" dot={false} strokeWidth={1.5} connectNulls isAnimationActive={false} />
            <Line type="monotone" dataKey="D" stroke="#3b82f6" dot={false} strokeWidth={1.5} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* RSI */}
      <div>
        <div className="flex gap-4 text-xs text-slate-600 mb-1">
          <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-purple-500 inline-block" />RSI(14)</span>
          <span className="text-emerald-600">─ ─ 30 超賣</span>
          <span className="text-red-500/70">─ ─ 70 超買</span>
        </div>
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={rsiData} margin={{ top: 2, right: 8, bottom: 0, left: 2 }}>
            <XAxis dataKey="date" tick={tickStyle} interval={Math.floor(rsiData.length / 5)} />
            <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={tickStyle} width={28} />
            <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="4 2" strokeWidth={1} strokeOpacity={0.6} />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} strokeOpacity={0.6} />
            <Tooltip {...tooltipStyle} formatter={(v: any) => [(v as number)?.toFixed(1), 'RSI']} labelFormatter={(l: any) => `日期 ${l}`} />
            <Line type="monotone" dataKey="RSI" stroke="#8b5cf6" dot={false} strokeWidth={1.5} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* BIAS */}
      <div>
        <div className="flex gap-4 text-xs text-slate-600 mb-1">
          <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-blue-400 inline-block" />BIAS(20)</span>
          <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-purple-400 inline-block" />BIAS(60)</span>
          <span className="text-amber-500/80">⚠ ±10% 警戒</span>
        </div>
        <ResponsiveContainer width="100%" height={80}>
          <ComposedChart data={biasData} margin={{ top: 2, right: 8, bottom: 0, left: 2 }}>
            <XAxis dataKey="date" tick={tickStyle} interval={Math.floor(biasData.length / 5)} />
            <YAxis tick={tickStyle} width={36} tickFormatter={(v: any) => `${(v as number)?.toFixed(0)}%`} />
            <ReferenceLine y={0} stroke="#1e293b" strokeWidth={1} />
            <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} strokeOpacity={0.5} label={{ value: '+10%', fontSize: 9, fill: '#ef4444', position: 'insideTopRight' }} />
            <ReferenceLine y={-10} stroke="#22c55e" strokeDasharray="4 2" strokeWidth={1} strokeOpacity={0.5} label={{ value: '-10%', fontSize: 9, fill: '#22c55e', position: 'insideBottomRight' }} />
            <Tooltip {...tooltipStyle} formatter={(v: any, n: any) => [`${(v as number)?.toFixed(1)}%`, n === 'BIAS20' ? 'BIAS(20)' : 'BIAS(60)']} labelFormatter={(l: any) => `日期 ${l}`} />
            <Line type="monotone" dataKey="BIAS20" stroke="#60a5fa" dot={false} strokeWidth={1.5} connectNulls isAnimationActive={false} />
            <Line type="monotone" dataKey="BIAS60" stroke="#a78bfa" dot={false} strokeWidth={1} connectNulls isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
