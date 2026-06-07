import { ComposedChart, Bar, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Cell, Tooltip } from 'recharts';
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

export function MACDChart({ ohlcv, indicators }: Props) {
  const start = Math.max(0, ohlcv.length - 120);
  const data = ohlcv.slice(start).map((d, ri) => {
    const i = start + ri;
    return {
      date: d.date.slice(5),
      macd: indicators.macdLine[i],
      signal: indicators.macdSignal[i],
      histogram: indicators.macdHistogram[i],
    };
  }).filter(d => d.macd !== null);

  return (
    <div>
      <div className="flex gap-4 text-xs text-slate-600 mb-2">
        <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-blue-500 inline-block" />MACD</span>
        <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-red-400 inline-block" />Signal</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500/40 rounded-sm inline-block" />柱狀</span>
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <ComposedChart data={data} margin={{ top: 2, right: 8, bottom: 0, left: 2 }}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#475569' }} interval={Math.floor(data.length / 5)} />
          <YAxis tick={{ fontSize: 9, fill: '#475569' }} width={44} tickFormatter={(v: any) => v?.toFixed(1)} />
          <Tooltip
            {...tooltipStyle}
            formatter={(v: any, name: any) => [
              (v as number)?.toFixed(2),
              name === 'macd' ? 'MACD' : name === 'signal' ? 'Signal' : 'Histogram',
            ]}
            labelFormatter={(l: any) => `日期 ${l}`}
          />
          <ReferenceLine y={0} stroke="#1e293b" strokeWidth={1} />
          <Bar dataKey="histogram" isAnimationActive={false} maxBarSize={6}>
            {data.map((entry, i) => (
              <Cell key={i} fill={(entry.histogram ?? 0) >= 0 ? 'rgba(239,68,68,0.6)' : 'rgba(34,197,94,0.6)'} />
            ))}
          </Bar>
          <Line type="monotone" dataKey="macd" stroke="#3b82f6" dot={false} strokeWidth={1.5} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="signal" stroke="#ef4444" dot={false} strokeWidth={1.5} connectNulls isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
