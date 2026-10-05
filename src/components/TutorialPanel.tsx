import { useState } from 'react';
import {
  ComposedChart, LineChart, Line, Bar, XAxis, YAxis,
  ReferenceLine, ReferenceArea, ResponsiveContainer, Cell,
} from 'recharts';

const CARD = 'bg-[#0c1628] rounded-xl border border-slate-700/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]';

// ── Synthetic illustrative datasets (hand-crafted to show a clean textbook pattern) ──

const maData = [
  { i: 0, price: 100, ma5: 101, ma20: 103 }, { i: 1, price: 98, ma5: 100, ma20: 103 },
  { i: 2, price: 95, ma5: 98, ma20: 102 }, { i: 3, price: 92, ma5: 96, ma20: 101 },
  { i: 4, price: 90, ma5: 93, ma20: 100 }, { i: 5, price: 89, ma5: 91, ma20: 99 },
  { i: 6, price: 91, ma5: 90, ma20: 98 }, { i: 7, price: 94, ma5: 91, ma20: 97 },
  { i: 8, price: 97, ma5: 92, ma20: 96 }, { i: 9, price: 100, ma5: 94, ma20: 95 },
  { i: 10, price: 103, ma5: 97, ma20: 95 }, { i: 11, price: 106, ma5: 100, ma20: 95 },
  { i: 12, price: 108, ma5: 103, ma20: 96 }, { i: 13, price: 111, ma5: 106, ma20: 97 },
  { i: 14, price: 113, ma5: 108, ma20: 98 }, { i: 15, price: 115, ma5: 111, ma20: 99 },
  { i: 16, price: 117, ma5: 113, ma20: 101 }, { i: 17, price: 119, ma5: 115, ma20: 103 },
];
const maCrossIdx = 10; // ma5 crosses above ma20

const bbData = [
  { i: 0, price: 100, upper: 108, lower: 92 }, { i: 1, price: 101, upper: 107, lower: 93 },
  { i: 2, price: 100, upper: 106, lower: 94 }, { i: 3, price: 102, upper: 105, lower: 96 },
  { i: 4, price: 101, upper: 104.5, lower: 97 }, { i: 5, price: 102, upper: 104, lower: 98 },
  { i: 6, price: 101, upper: 103.5, lower: 98.5 }, { i: 7, price: 102, upper: 103.2, lower: 99 },
  { i: 8, price: 102.5, upper: 103, lower: 99.5 }, { i: 9, price: 103, upper: 103.5, lower: 100 },
  { i: 10, price: 106, upper: 106, lower: 100 }, { i: 11, price: 110, upper: 110, lower: 100 },
  { i: 12, price: 114, upper: 114, lower: 101 }, { i: 13, price: 117, upper: 118, lower: 102 },
  { i: 14, price: 120, upper: 121, lower: 103 },
];
const squeezeStart = 6, squeezeEnd = 9, breakoutIdx = 10;

const macdData = [
  { i: 0, macd: -3, signal: -1.5, hist: -1.5 }, { i: 1, macd: -3.4, signal: -2, hist: -1.4 },
  { i: 2, macd: -3.2, signal: -2.4, hist: -0.8 }, { i: 3, macd: -2.6, signal: -2.5, hist: -0.1 },
  { i: 4, macd: -1.8, signal: -2.3, hist: 0.5 }, { i: 5, macd: -0.9, signal: -2.0, hist: 1.1 },
  { i: 6, macd: 0.2, signal: -1.4, hist: 1.6 }, { i: 7, macd: 1.2, signal: -0.6, hist: 1.8 },
  { i: 8, macd: 2.0, signal: 0.3, hist: 1.7 }, { i: 9, macd: 2.5, signal: 1.1, hist: 1.4 },
  { i: 10, macd: 2.6, signal: 1.7, hist: 0.9 }, { i: 11, macd: 2.3, signal: 2.0, hist: 0.3 },
  { i: 12, macd: 1.8, signal: 2.1, hist: -0.3 }, { i: 13, macd: 1.2, signal: 1.9, hist: -0.7 },
];
const macdCrossIdx = 6;

const kdData = [
  { i: 0, k: 55, d: 60 }, { i: 1, k: 45, d: 55 }, { i: 2, k: 32, d: 47 },
  { i: 3, k: 20, d: 38 }, { i: 4, k: 12, d: 28 }, { i: 5, k: 9, d: 20 },
  { i: 6, k: 15, d: 15 }, { i: 7, k: 24, d: 16 }, { i: 8, k: 38, d: 20 },
  { i: 9, k: 52, d: 29 }, { i: 10, k: 66, d: 40 }, { i: 11, k: 78, d: 52 },
  { i: 12, k: 85, d: 64 }, { i: 13, k: 89, d: 74 }, { i: 14, k: 86, d: 81 },
];
const kdCrossIdx = 6;

const rsiData = [
  { i: 0, rsi: 58 }, { i: 1, rsi: 50 }, { i: 2, rsi: 40 }, { i: 3, rsi: 31 },
  { i: 4, rsi: 24 }, { i: 5, rsi: 27 }, { i: 6, rsi: 34 }, { i: 7, rsi: 45 },
  { i: 8, rsi: 56 }, { i: 9, rsi: 65 }, { i: 10, rsi: 73 }, { i: 11, rsi: 78 },
  { i: 12, rsi: 71 }, { i: 13, rsi: 62 },
];

const biasData = [
  { i: 0, bias: 2 }, { i: 1, bias: 5 }, { i: 2, bias: 8 }, { i: 3, bias: 11.5 },
  { i: 4, bias: 9 }, { i: 5, bias: 4 }, { i: 6, bias: -1 }, { i: 7, bias: -6 },
  { i: 8, bias: -10.5 }, { i: 9, bias: -7 }, { i: 10, bias: -2 }, { i: 11, bias: 3 },
];

const volData = [
  { i: 0, price: 100, vol: 20, up: false }, { i: 1, price: 99, vol: 18, up: false },
  { i: 2, price: 101, vol: 22, up: true }, { i: 3, price: 100, vol: 17, up: false },
  { i: 4, price: 103, vol: 45, up: true }, { i: 5, price: 107, vol: 60, up: true },
  { i: 6, price: 106, vol: 25, up: false }, { i: 7, price: 108, vol: 19, up: true },
];

function LessonCard({
  icon, title, formula, summary, rules, chart, warn,
}: {
  icon: string; title: string; formula?: string; summary: string;
  rules: { label: string; desc: string; tone: 'buy' | 'sell' | 'watch' | 'info' }[];
  chart: React.ReactNode;
  warn?: string;
}) {
  const toneColor: Record<string, string> = {
    buy: 'text-red-300 bg-red-950/40 border-red-800/30',
    sell: 'text-emerald-300 bg-emerald-950/40 border-emerald-800/30',
    watch: 'text-blue-300 bg-blue-950/40 border-blue-800/30',
    info: 'text-slate-400 bg-slate-800/40 border-slate-700/30',
  };
  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <h3 className="font-semibold text-slate-200">{title}</h3>
        {formula && <span className="text-xs text-slate-600 font-mono ml-1">{formula}</span>}
      </div>
      <p className="text-sm text-slate-400 leading-relaxed mb-3 ml-7">{summary}</p>

      <div className="ml-7 mb-3 rounded-lg border border-slate-800/60 bg-[#060e1a] p-2">
        <ResponsiveContainer width="100%" height={140}>
          {chart as any}
        </ResponsiveContainer>
      </div>

      <div className="ml-7 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rules.map(r => (
          <div key={r.label} className={`rounded-lg border px-3 py-2 ${toneColor[r.tone]}`}>
            <div className="text-xs font-semibold mb-0.5">{r.label}</div>
            <div className="text-xs opacity-80 leading-relaxed">{r.desc}</div>
          </div>
        ))}
      </div>

      {warn && (
        <div className="ml-7 mt-3 text-xs text-amber-500/80 bg-amber-950/20 border border-amber-900/30 rounded-lg px-3 py-2">
          ⚠ {warn}
        </div>
      )}
    </div>
  );
}

export function TutorialPanel() {
  const [tab, setTab] = useState<'trend' | 'momentum' | 'volatility' | 'volume'>('trend');

  const CATS = [
    { key: 'trend' as const, label: '趨勢', icon: '📊' },
    { key: 'momentum' as const, label: '力道', icon: '⚡' },
    { key: 'volatility' as const, label: '波動', icon: '🌊' },
    { key: 'volume' as const, label: '量能', icon: '📦' },
  ];

  return (
    <div className="space-y-4">
      <div className={CARD}>
        <h2 className="font-bold text-slate-100 text-lg mb-1">📚 技術分析教學</h2>
        <p className="text-sm text-slate-500">
          每個指標都搭配範例圖形，說明「這個訊號長怎樣」以及「該怎麼解讀」。這裡的圖是示意用的理想化範例，
          實際走勢不會這麼乾淨俐落，僅供建立判讀直覺。
        </p>
        <div className="flex gap-1.5 mt-4 flex-wrap">
          {CATS.map(c => (
            <button
              key={c.key}
              onClick={() => setTab(c.key)}
              className={`text-sm px-3.5 py-1.5 rounded-lg border transition-all font-medium ${
                tab === c.key
                  ? 'bg-gradient-to-b from-blue-500 to-blue-700 border-blue-400/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                  : 'bg-slate-800/60 border-slate-700/30 text-slate-400 hover:text-slate-200'
              }`}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'trend' && (
        <>
          <LessonCard
            icon="📈"
            title="均線 MA（Moving Average）"
            formula="MA5 / MA20 / MA60"
            summary="過去 N 天收盤價的平均值，用來過濾短期雜訊、判斷趨勢方向。短天期均線（如 MA5）反應較快，長天期（如 MA60）反應較慢但較穩定。"
            chart={
              <LineChart data={maData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="i" hide />
                <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                <ReferenceLine x={maCrossIdx} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '黃金交叉', position: 'top', fill: '#f59e0b', fontSize: 10 }} />
                <Line type="monotone" dataKey="price" stroke="#64748b" strokeWidth={1} dot={false} />
                <Line type="monotone" dataKey="ma5" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ma20" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            }
            rules={[
              { label: '黃金交叉（買進訊號）', tone: 'buy', desc: '短天期均線（MA5）由下往上穿越長天期均線（MA20），代表短期動能轉強，趨勢可能翻多。' },
              { label: '死亡交叉（賣出訊號）', tone: 'sell', desc: 'MA5 由上往下跌破 MA20，代表短期轉弱，趨勢可能翻空。' },
              { label: '站上均線', tone: 'watch', desc: '股價 > MA20 視為中短期多頭，是許多策略的最低門檻。' },
              { label: '多頭排列', tone: 'info', desc: 'MA5 > MA20 > MA60，三線由上而下排列整齊，代表強勢上升趨勢。' },
            ]}
          />

          <LessonCard
            icon="📉"
            title="MACD（指數平滑異同移動平均線）"
            formula="EMA12 - EMA26，再取9日 EMA 為 Signal"
            summary="用兩條不同天期 EMA 的差值（DIF/MACD 線）判斷動能轉折，再搭配訊號線（Signal）與柱狀圖（Histogram）觀察動能強弱變化。"
            chart={
              <ComposedChart data={macdData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="i" hide />
                <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                <ReferenceLine y={0} stroke="#334155" />
                <ReferenceLine x={macdCrossIdx} stroke="#34d399" strokeDasharray="3 3" label={{ value: '黃金交叉', position: 'top', fill: '#34d399', fontSize: 10 }} />
                <Bar dataKey="hist" isAnimationActive={false} maxBarSize={10}>
                  {macdData.map((d, idx) => <Cell key={idx} fill={d.hist >= 0 ? 'rgba(239,68,68,0.6)' : 'rgba(34,197,94,0.6)'} />)}
                </Bar>
                <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="signal" stroke="#ef4444" strokeWidth={2} dot={false} />
              </ComposedChart>
            }
            rules={[
              { label: 'MACD 黃金交叉', tone: 'buy', desc: 'MACD 線（藍）由下往上穿越 Signal 線（紅），代表多頭動能啟動。' },
              { label: 'MACD 死亡交叉', tone: 'sell', desc: 'MACD 線由上往下穿越 Signal 線，代表空頭動能增強。' },
              { label: '柱狀圖翻紅/翻綠', tone: 'info', desc: '柱狀圖由負轉正（翻紅，本 app 慣例）代表動能剛轉強，常比線交叉更早出現。' },
              { label: '零軸上/下', tone: 'watch', desc: 'MACD 在零軸之上代表中期仍偏多，零軸之下偏空，可作為交叉訊號的過濾條件。' },
            ]}
            warn="MACD 是落後指標，訊號通常在轉折發生一段時間後才出現，適合確認趨勢而非精準抓最低/最高點。"
          />
        </>
      )}

      {tab === 'momentum' && (
        <>
          <LessonCard
            icon="⚡"
            title="KD 隨機指標（RSV / K / D）"
            formula="RSV = (收盤 - 9日最低) ÷ (9日最高 - 9日最低) × 100"
            summary="比較目前收盤價落在近期高低區間的相對位置，RSV 經過兩次平滑後得到 K、D 值，數值介於 0～100，用來判斷短線超買超賣與動能轉折。"
            chart={
              <LineChart data={kdData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="i" hide />
                <YAxis hide domain={[0, 100]} />
                <ReferenceArea y1={0} y2={20} fill="#22c55e" fillOpacity={0.07} />
                <ReferenceArea y1={80} y2={100} fill="#ef4444" fillOpacity={0.07} />
                <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={20} stroke="#22c55e" strokeDasharray="3 3" />
                <ReferenceLine x={kdCrossIdx} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: '低檔黃金交叉', position: 'top', fill: '#fbbf24', fontSize: 10 }} />
                <Line type="monotone" dataKey="k" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="d" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            }
            rules={[
              { label: '低檔黃金交叉（強力買進）', tone: 'buy', desc: 'K、D 都 < 20（超賣區）時，K 由下往上穿越 D，是較可靠的買進訊號。' },
              { label: '高檔死亡交叉（注意獲利了結）', tone: 'sell', desc: 'K、D 都 > 80（超買區）時，K 由上往下跌破 D，短線拉回機率較高。' },
              { label: 'K > 80 超買 / K < 20 超賣', tone: 'watch', desc: '單純超買超賣不代表要立刻反轉，強勢股可以持續鈍化在高檔。' },
            ]}
          />

          <LessonCard
            icon="📐"
            title="RSI 相對強弱指標"
            formula="RSI = 100 - 100 / (1 + 平均漲幅 ÷ 平均跌幅)"
            summary="衡量一段期間內上漲力道占整體波動的比例，0～100 之間。數值越高代表買方力道越強，越低代表賣方力道越強。"
            chart={
              <LineChart data={rsiData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="i" hide />
                <YAxis hide domain={[0, 100]} />
                <ReferenceArea y1={0} y2={30} fill="#22c55e" fillOpacity={0.07} />
                <ReferenceArea y1={70} y2={100} fill="#ef4444" fillOpacity={0.07} />
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="rsi" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            }
            rules={[
              { label: 'RSI < 30 超賣', tone: 'buy', desc: '賣壓可能已經過度，逢低留意反彈機會，不代表立刻買進。' },
              { label: 'RSI > 70 超買', tone: 'sell', desc: '買盤可能過熱，短線拉回風險升高，適合注意停利。' },
              { label: '背離訊號（進階）', tone: 'info', desc: '股價創新高但 RSI 未創新高（頂背離），或股價創新低但 RSI 未創新低（底背離），常是轉折前兆。' },
            ]}
          />
        </>
      )}

      {tab === 'volatility' && (
        <>
          <LessonCard
            icon="🌊"
            title="布林通道 Bollinger Bands"
            formula="中線 = MA20，上下軌 = 中線 ± 2 倍標準差"
            summary="用統計學的標準差衡量股價的正常波動區間。通道變窄代表波動縮小（變盤前兆），通道變寬代表波動放大、趨勢明確。"
            chart={
              <ComposedChart data={bbData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="i" hide />
                <YAxis hide domain={['dataMin - 3', 'dataMax + 3']} />
                <ReferenceArea x1={squeezeStart} x2={squeezeEnd} fill="#f59e0b" fillOpacity={0.08} />
                <ReferenceLine x={breakoutIdx} stroke="#34d399" strokeDasharray="3 3" label={{ value: '突破', position: 'top', fill: '#34d399', fontSize: 10 }} />
                <Line type="monotone" dataKey="upper" stroke="#94a3b8" strokeDasharray="4 2" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="lower" stroke="#94a3b8" strokeDasharray="4 2" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="price" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            }
            rules={[
              { label: '通道擠壓（變盤前兆）', tone: 'watch', desc: '上下軌距離明顯縮小（橘色區塊），代表波動度降到低點，股價即將選擇方向，但方向未定。' },
              { label: '突破上軌', tone: 'buy', desc: '擠壓後股價放量突破上軌，常伴隨趨勢的開始，是較積極的進場點。' },
              { label: '觸及下軌', tone: 'sell', desc: '股價貼著下軌走或跌破下軌，代表賣壓沉重，趨勢偏空。' },
            ]}
            warn="擠壓不代表會往上突破，也可能向下破底，建議等實際突破方向確認後再行動，不要提前猜方向。"
          />

          <LessonCard
            icon="🌡️"
            title="乖離率 BIAS"
            formula="BIAS = (股價 - MA) ÷ MA × 100%"
            summary="衡量股價偏離均線的程度。正值代表股價在均線之上（偏熱），負值代表在均線之下（偏冷），數值越極端代表偏離越大。"
            chart={
              <LineChart data={biasData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="i" hide />
                <YAxis hide domain={[-15, 15]} />
                <ReferenceLine y={0} stroke="#334155" />
                <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '+10% 過熱', position: 'insideTopRight', fill: '#ef4444', fontSize: 9 }} />
                <ReferenceLine y={-10} stroke="#22c55e" strokeDasharray="3 3" label={{ value: '-10% 過冷', position: 'insideBottomRight', fill: '#22c55e', fontSize: 9 }} />
                <Line type="monotone" dataKey="bias" stroke="#60a5fa" strokeWidth={2} dot={false} />
              </LineChart>
            }
            rules={[
              { label: '乖離過熱（> +10%）', tone: 'sell', desc: '股價短線漲過頭、遠離均線，拉回修正的機率上升，適合考慮分批獲利了結。' },
              { label: '乖離過冷（< -10%）', tone: 'buy', desc: '股價短線跌過頭、遠離均線，可能出現反彈，但仍需確認趨勢未破壞。' },
              { label: '乖離收斂', tone: 'info', desc: '股價重新貼近均線，代表短線過熱/過冷已經修正完畢。' },
            ]}
          />
        </>
      )}

      {tab === 'volume' && (
        <LessonCard
          icon="📦"
          title="成交量 Volume"
          summary="價格的變化要搭配成交量一起判讀才有意義：「有量才有價」，沒有量能支撐的漲跌通常不持久。本範例比較「價漲量增」與「價漲量縮」兩種情境。"
          chart={
            <ComposedChart data={volData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="i" hide />
              <YAxis hide yAxisId="price" domain={['dataMin - 3', 'dataMax + 3']} />
              <YAxis hide yAxisId="vol" orientation="right" domain={[0, 80]} />
              <Bar yAxisId="vol" dataKey="vol" isAnimationActive={false} maxBarSize={14}>
                {volData.map((d, idx) => <Cell key={idx} fill={d.up ? 'rgba(239,68,68,0.45)' : 'rgba(100,116,139,0.35)'} />)}
              </Bar>
              <Line yAxisId="price" type="monotone" dataKey="price" stroke="#60a5fa" strokeWidth={2} dot={false} />
            </ComposedChart>
          }
          rules={[
            { label: '價漲量增（健康攻擊訊號）', tone: 'buy', desc: '上漲且成交量明顯放大（本 app 門檻：均量 1.5 倍以上），代表買盤積極、籌碼換手順暢。' },
            { label: '價跌量增（賣壓沉重）', tone: 'sell', desc: '下跌伴隨爆量，代表恐慌性賣壓或大戶出貨，應提高警覺。' },
            { label: '價漲量縮（動能待確認）', tone: 'watch', desc: '上漲但量能不足，可能只是淺層反彈，追價前最好再觀察一天。' },
          ]}
        />
      )}
    </div>
  );
}
