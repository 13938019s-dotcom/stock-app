import { useEffect } from 'react';

interface Props {
  onClose: () => void;
}

const SECTIONS = [
  {
    icon: '📊',
    title: '趨勢確認：MA 均線 + MACD',
    why: '先確定方向，再找買點。逆勢操作勝率極低。',
    items: [
      { name: 'MA20（20日均線）', desc: '股價站在 MA20 之上，代表中短期趨勢向上，是本策略的「最低門檻」。低於 MA20 不考慮買入。' },
      { name: 'MA60（60日均線）', desc: '長期趨勢判斷。股價在 MA60 之上表示整體強勢。' },
      { name: 'MACD（12,26,9）', desc: 'MACD 線上穿 Signal 為黃金交叉，代表短期動能轉強；死叉則是轉弱訊號。柱狀圖由負轉正更可信。' },
    ],
  },
  {
    icon: '⚡',
    title: '力道研判：KD + RSI',
    why: '確認趨勢後，等待低點回撤再進場，提高風險報酬比。',
    items: [
      { name: 'KD 隨機指標（週期9）', desc: 'K < 20 且 D < 20 為超賣；此時若 K 上穿 D（黃金交叉），是強力買入訊號。K > 80 超買則注意獲利了結。' },
      { name: 'RSI（14日）', desc: 'RSI < 30 超賣、> 70 超買。與 KD 交叉確認可提高可信度。RSI 在 50 以上表示多方主導。' },
    ],
  },
  {
    icon: '🌊',
    title: '波動觀察：布林通道 + 乖離率',
    why: '預判「即將發動」的時機，避免在高波動頂部追高。',
    items: [
      { name: '布林通道（MA20 ± 2σ）', desc: '通道寬度縮小（擠壓）代表波動即將放大，但方向未定。等待確認突破上通道為買入；跌破下通道則回避。' },
      { name: 'BIAS 乖離率', desc: 'MA20 乖離超 +10%、MA60 超 +15% 為過熱警戒，短線回調機率高。反之超跌則逢低留意。' },
    ],
  },
  {
    icon: '📦',
    title: '量能驗證：成交量',
    why: '「有量才有價」。沒有量能配合的上漲容易夭折。',
    items: [
      { name: '價漲量增', desc: '今日上漲且成交量 > 20日均量 × 1.5 倍，代表攻擊訊號健康，機構參與度高。' },
      { name: '價跌量增', desc: '下跌伴隨大量是空方主導，賣壓較重，需謹慎回避。' },
      { name: '價漲量縮', desc: '上漲量能不足，動能待確認，可能是短暫反彈而非趨勢轉折。' },
    ],
  },
  {
    icon: '🏦',
    title: '為何加入基本面篩選？',
    why: '技術面找時機，基本面找好股。兩者結合可大幅降低買到爛股的風險。',
    items: [
      { name: 'EPS 連續3年增長', desc: '公司獲利持續成長，代表商業模式健康。' },
      { name: 'ROE > 15%', desc: '每 100 元股東的錢能賺超過 15 元，顯示管理層效率高。' },
      { name: '負債比 < 50%', desc: '不過度依賴借款，財務結構穩健，抗風險能力強。' },
      { name: 'PEG < 1.2', desc: 'PEG = P/E ÷ 盈餘成長率。< 1 代表成長被低估，1.2 以下屬合理。避免追買本夢比。' },
      { name: '自由現金流 > 0', desc: '有現金流才能配息、回購、擴展。負現金流公司靠融資過活，風險高。' },
    ],
  },
];

export function TechExplainModal({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-[#0c1628] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] border border-slate-700/40 max-w-2xl w-full mt-10 mb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40">
          <div>
            <h2 className="text-lg font-bold text-white">技術分析組合說明</h2>
            <p className="text-xs text-slate-500 mt-0.5">為什麼選這 4 個面向？</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-700/60 hover:text-slate-200 transition-colors text-lg">×</button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="bg-blue-950/50 rounded-xl p-4 text-sm text-blue-300 border border-blue-800/40">
            <p className="font-medium mb-1">核心邏輯：趨勢 → 力道 → 波動 → 量能 四重驗證</p>
            <p className="text-blue-400 text-xs">每個訊號獨立時常出現假突破，四者共鳴才代表較高勝率的機會。先確認趨勢，再找力道低點，觀察波動即將放大，最後等量能確認。</p>
          </div>

          {SECTIONS.map(sec => (
            <div key={sec.title}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{sec.icon}</span>
                <h3 className="font-semibold text-slate-200">{sec.title}</h3>
              </div>
              <p className="text-xs text-slate-500 mb-3 ml-7">💡 {sec.why}</p>
              <div className="space-y-2 ml-7">
                {sec.items.map(item => (
                  <div key={item.name} className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/30">
                    <div className="text-sm font-medium text-slate-300 mb-0.5">{item.name}</div>
                    <div className="text-xs text-slate-500 leading-relaxed">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-amber-950/50 rounded-xl p-4 text-xs text-amber-300 border border-amber-800/40">
            <p className="font-medium mb-1">⚠️ 重要提醒</p>
            <p>技術分析是機率工具，不是水晶球。即使所有訊號對齊，仍可能因突發消息、總經環境改變而失效。建議配合停損、分批布局、控制倉位，避免單押。</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-700/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-b from-blue-500 to-blue-700 text-white text-sm rounded-lg hover:from-blue-400 hover:to-blue-600 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_12px_rgba(59,130,246,0.3)] border border-blue-400/20 font-medium"
          >
            了解了
          </button>
        </div>
      </div>
    </div>
  );
}
