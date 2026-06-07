import { useState } from 'react';

const AUTH_KEY = 'stockiq_auth_v1';
const PW = 'zoezomi';

export function LoginGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(() => localStorage.getItem(AUTH_KEY) === '1');
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  if (authed) return <>{children}</>;

  const submit = () => {
    if (input === PW) {
      localStorage.setItem(AUTH_KEY, '1');
      setAuthed(true);
    } else {
      setError(true);
      setInput('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060e1a] px-4">
      <div className="bg-[#0c1628] rounded-2xl border border-slate-700/40 p-8 w-full max-w-sm shadow-[0_24px_80px_rgba(0,0,0,0.8)]">
        <div className="text-center mb-7">
          <div className="text-4xl mb-3">📊</div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            StockIQ
          </h1>
          <p className="text-xs text-slate-600 mt-1.5">個人股票分析工具</p>
        </div>

        <div className="space-y-3">
          <input
            autoFocus
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false); }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="請輸入密碼"
            className={`w-full bg-slate-800/70 border rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all ${
              error
                ? 'border-red-600/60 focus:border-red-500/60'
                : 'border-slate-700/60 focus:ring-1 focus:ring-blue-500/60 focus:border-blue-600/50'
            }`}
          />

          {error && (
            <p className="text-xs text-red-400 text-center">密碼錯誤，請再試一次</p>
          )}

          <button
            onClick={submit}
            className="w-full bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_16px_rgba(59,130,246,0.35)] border border-blue-400/20"
          >
            進入
          </button>
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-[11px] text-slate-600 text-center leading-relaxed">
            ⚠️ 本工具僅供學習與參考，所有資料均有延遲，<br />不構成任何投資建議，請自行評估風險。
          </p>
          <p className="text-[11px] text-slate-700 text-center">
            Made by <span className="text-slate-500 font-medium">zoezomi</span>
          </p>
        </div>
      </div>
    </div>
  );
}
