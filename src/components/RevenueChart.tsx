import { ComposedChart, Bar, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Cell, Tooltip } from 'recharts';
import type { MonthRevenue } from '../services/twseRevenue';

interface Props {
  data: MonthRevenue[];
}

const tooltipStyle = {
  contentStyle: {
    fontSize: 11, borderRadius: 8,
    border: '1px solid rgba(59,130,246,0.2)',
    backgroundColor: '#0c1628', color: '#cbd5e1',
  },
};

function fmtAmt(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(0)}千億`;
  if (v >= 1) return `${v.toFixed(0)}億`;
  return `${(v * 100).toFixed(0)}百萬`;
}

export function RevenueChart({ data }: Props) {
  if (data.length === 0) {
    return <div className="text-slate-600 text-xs text-center py-5">無月營收資料（僅支援台灣上市櫃股票）</div>;
  }

  // Auto-detect unit: if median revenue > 1e8 assume 元, else assume 千元
  const median = [...data].sort((a, b) => a.revenue - b.revenue)[Math.floor(data.length / 2)]?.revenue ?? 0;
  const divisor = median > 1e8 ? 1e8 : 1e5; // convert to 億元

  const chartData = data.map(d => ({
    date: d.date.slice(2, 7).replace('-', '/'),
    rev: +(d.revenue / divisor).toFixed(1),
    yoy: d.yoyGrowth,
  }));

  const last = data[data.length - 1];
  const lastRev = last ? last.revenue / divisor : 0;
  const tickStyle = { fontSize: 9, fill: '#475569' };

  return (
    <div>
      {last && (
        <div className="flex flex-wrap gap-x-5 text-xs text-slate-500 mb-2">
          <span>最新 {last.date.slice(0, 7)}</span>
          <span className="text-slate-300">營收 {fmtAmt(lastRev)}元</span>
          {last.yoyGrowth !== null && (
            <span className={last.yoyGrowth >= 0 ? 'text-red-400' : 'text-emerald-400'}>
              年增率 {last.yoyGrowth >= 0 ? '+' : ''}{last.yoyGrowth}%
            </span>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={150}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 44, bottom: 0, left: 0 }}>
          <XAxis dataKey="date" tick={tickStyle} interval={Math.floor(chartData.length / 6)} />
          <YAxis yAxisId="rev" tick={tickStyle} width={48} tickFormatter={v => `${v}億`} />
          <YAxis yAxisId="yoy" orientation="right" tick={tickStyle} width={40} tickFormatter={v => `${v}%`} />
          <ReferenceLine yAxisId="yoy" y={0} stroke="#1e293b" strokeWidth={1} />
          <Tooltip
            {...tooltipStyle}
            formatter={(v: any, name: any) => [
              name === 'rev' ? `${v}億元` : v !== null ? `${v}%` : '—',
              name === 'rev' ? '月營收' : 'YoY 年增率',
            ]}
            labelFormatter={(l: any) => `${l}`}
          />
          <Bar yAxisId="rev" dataKey="rev" maxBarSize={22} isAnimationActive={false}>
            {chartData.map((d, i) => (
              <Cell
                key={i}
                fill={(d.yoy ?? 0) >= 0 ? 'rgba(59,130,246,0.75)' : 'rgba(100,116,139,0.5)'}
              />
            ))}
          </Bar>
          <Line
            yAxisId="yoy" type="monotone" dataKey="yoy"
            stroke="#f59e0b" dot={false} strokeWidth={1.5}
            connectNulls isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="text-xs text-slate-700 text-right mt-1">
        藍柱 = 月營收（億元）╱ 橘線 = YoY 年增率　│　年增率為正 = 藍、負 = 灰
      </div>
    </div>
  );
}
