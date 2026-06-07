import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Cell, Tooltip } from 'recharts';
import type { InstitutionalDay } from '../services/twseInstitutional';

interface Props {
  data: InstitutionalDay[];
}

const tooltipStyle = {
  contentStyle: {
    fontSize: 11, borderRadius: 8,
    border: '1px solid rgba(59,130,246,0.2)',
    backgroundColor: '#0c1628',
    color: '#cbd5e1',
  },
};

const tickStyle = { fontSize: 9, fill: '#475569' };

function fmtLot(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 10000) return `${(v / 10000).toFixed(1)}萬`;
  return v.toLocaleString();
}

interface SubChartProps {
  data: { date: string; value: number }[];
  color: string;
  height: number;
  label: string;
}

function SubChart({ data, color, height, label }: SubChartProps) {
  return (
    <div>
      <div className="text-xs text-slate-600 mb-0.5 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: color, opacity: 0.8 }} />
        {label}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 2, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="date" tick={tickStyle} interval={Math.floor(data.length / 5)} />
          <YAxis tick={tickStyle} width={44} tickFormatter={fmtLot} />
          <ReferenceLine y={0} stroke="#1e293b" strokeWidth={1} />
          <Tooltip
            {...tooltipStyle}
            formatter={(v: any) => [`${fmtLot(v as number)}張`]}
            labelFormatter={(l: any) => `日期 ${l}`}
          />
          <Bar dataKey="value" maxBarSize={8} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.value >= 0 ? '#ef4444' : '#22c55e'} fillOpacity={0.75} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InstitutionalChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-slate-600 text-xs text-center py-5">
        無法取得三大法人資料（僅支援台灣上市股票）
      </div>
    );
  }

  const display = data.slice(-40);
  const last = data[data.length - 1];

  const foreignData = display.map(d => ({ date: d.date.slice(5), value: d.foreign }));
  const trustData = display.map(d => ({ date: d.date.slice(5), value: d.trust }));
  const dealerData = display.map(d => ({ date: d.date.slice(5), value: d.dealer }));

  const tag = (v: number) => (
    <span className={v >= 0 ? 'text-red-400' : 'text-emerald-400'}>
      {v >= 0 ? '+' : ''}{v.toLocaleString()}張
    </span>
  );

  return (
    <div className="space-y-3">
      {last && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          <span>最新 {last.date.slice(5)}</span>
          <span>外資 {tag(last.foreign)}</span>
          <span>投信 {tag(last.trust)}</span>
          <span>自營商 {tag(last.dealer)}</span>
          <span>合計 {tag(last.total)}</span>
        </div>
      )}

      <SubChart data={foreignData} color="#3b82f6" height={65} label="外資買賣超（張）" />
      <SubChart data={trustData} color="#8b5cf6" height={55} label="投信買賣超（張）" />
      <SubChart data={dealerData} color="#f59e0b" height={50} label="自營商買賣超（張）" />

      <div className="text-xs text-slate-700 text-right">紅色 = 買超 ／ 綠色 = 賣超</div>
    </div>
  );
}
