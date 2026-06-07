import type { OHLCV, Indicators, TechnicalSignal } from '../types/stock';

export function detectSignals(ohlcv: OHLCV[], ind: Indicators): TechnicalSignal[] {
  const signals: TechnicalSignal[] = [];
  const last = ohlcv.length - 1;
  const prev = last - 1;
  const close = ohlcv[last].close;
  const prevClose = ohlcv[prev].close;
  const volume = ohlcv[last].volume;

  // ── 趨勢: MA20 ──
  const ma20 = ind.ma20[last];
  if (ma20 !== null) {
    if (close > ma20) {
      signals.push({ id: 'trend-ma20', type: 'buy', category: '趨勢', icon: '📈',
        title: '站在20MA之上', detail: `現價 ${close.toFixed(1)} > MA20 ${ma20.toFixed(1)}，符合買入條件` });
    } else {
      signals.push({ id: 'trend-ma20', type: 'warning', category: '趨勢', icon: '⚠️',
        title: '跌破20MA', detail: `現價 ${close.toFixed(1)} < MA20 ${ma20.toFixed(1)}，暫不考慮買入` });
    }
  }

  // ── 趨勢: MACD ──
  const macd = ind.macdLine[last], sig = ind.macdSignal[last];
  const macdPrev = ind.macdLine[prev], sigPrev = ind.macdSignal[prev];
  if (macd !== null && sig !== null && macdPrev !== null && sigPrev !== null) {
    if (macd > sig && macdPrev <= sigPrev) {
      signals.push({ id: 'trend-macd', type: 'buy', category: '趨勢', icon: '✅',
        title: 'MACD 黃金交叉', detail: 'MACD 上穿 Signal，多頭動能啟動' });
    } else if (macd < sig && macdPrev >= sigPrev) {
      signals.push({ id: 'trend-macd', type: 'warning', category: '趨勢', icon: '⚠️',
        title: 'MACD 死亡交叉', detail: 'MACD 下穿 Signal，空頭動能增強' });
    } else {
      signals.push({ id: 'trend-macd', type: macd > sig ? 'neutral' : 'neutral', category: '趨勢', icon: 'ℹ️',
        title: macd > sig ? 'MACD 多頭排列' : 'MACD 空頭排列',
        detail: `MACD ${macd.toFixed(2)}  Signal ${sig.toFixed(2)}` });
    }
  }

  // ── 力道: KD ──
  const k = ind.kdK[last], d = ind.kdD[last];
  const kPrev = ind.kdK[prev], dPrev = ind.kdD[prev];
  if (!isNaN(k) && !isNaN(d) && !isNaN(kPrev) && !isNaN(dPrev)) {
    if (k < 20 && d < 20 && k > d && kPrev <= dPrev) {
      signals.push({ id: 'momentum-kd', type: 'buy', category: '力道', icon: '⭐',
        title: 'KD 低檔黃金交叉！', detail: `K=${k.toFixed(1)} D=${d.toFixed(1)} 均 <20，強力買入訊號` });
    } else if (k < 20) {
      signals.push({ id: 'momentum-kd', type: 'watch', category: '力道', icon: '👀',
        title: 'KD 超賣區', detail: `K=${k.toFixed(1)} D=${d.toFixed(1)}，等待黃金交叉` });
    } else if (k > 80) {
      signals.push({ id: 'momentum-kd', type: 'warning', category: '力道', icon: '⚠️',
        title: 'KD 超買區', detail: `K=${k.toFixed(1)} D=${d.toFixed(1)} >80，注意獲利了結` });
    } else {
      signals.push({ id: 'momentum-kd', type: 'neutral', category: '力道', icon: 'ℹ️',
        title: `KD 中性`, detail: `K=${k.toFixed(1)} D=${d.toFixed(1)}` });
    }
  }

  // ── 力道: RSI ──
  const rsi = ind.rsi[last];
  if (rsi !== null) {
    if (rsi < 30) {
      signals.push({ id: 'momentum-rsi', type: 'watch', category: '力道', icon: '👀',
        title: 'RSI 超賣', detail: `RSI=${rsi.toFixed(1)} <30，逢低留意買點` });
    } else if (rsi > 70) {
      signals.push({ id: 'momentum-rsi', type: 'warning', category: '力道', icon: '⚠️',
        title: 'RSI 超買', detail: `RSI=${rsi.toFixed(1)} >70，注意回調風險` });
    }
  }

  // ── 波動: 布林通道 ──
  const bwArr = ind.bollingerWidth.filter((v): v is number => v !== null);
  if (bwArr.length >= 20) {
    const curBW = bwArr[bwArr.length - 1];
    const avgBW = bwArr.slice(-30).reduce((a, b) => a + b, 0) / Math.min(bwArr.length, 30);
    const ratio = curBW / avgBW;
    if (ratio < 0.7) {
      signals.push({ id: 'vol-bb', type: 'watch', category: '波動', icon: '🔔',
        title: '布林通道擠壓', detail: `通道寬度僅均值的 ${(ratio * 100).toFixed(0)}%，即將變盤，注意方向` });
    } else if (ratio > 1.6) {
      signals.push({ id: 'vol-bb', type: 'neutral', category: '波動', icon: 'ℹ️',
        title: '布林通道擴張', detail: `波動趨勢明確，順勢操作` });
    } else {
      signals.push({ id: 'vol-bb', type: 'neutral', category: '波動', icon: 'ℹ️',
        title: '布林通道正常', detail: `通道寬度正常，無特殊訊號` });
    }
  }

  // ── 波動: BIAS 乖離率 ──
  const bias20 = ind.bias20[last];
  if (bias20 !== null) {
    if (bias20 > 10) {
      signals.push({ id: 'vol-bias', type: 'warning', category: '波動', icon: '🌡️',
        title: '乖離率過熱', detail: `MA20 乖離 +${bias20.toFixed(1)}%，短期過熱，注意回檔` });
    } else if (bias20 < -10) {
      signals.push({ id: 'vol-bias', type: 'watch', category: '波動', icon: '🌡️',
        title: '乖離率過冷', detail: `MA20 乖離 ${bias20.toFixed(1)}%，超跌區，可留意反彈` });
    }
  }

  // ── 量能 ──
  const avgVol = ohlcv.slice(last - 20, last).reduce((a, b) => a + b.volume, 0) / 20;
  const volRatio = volume / avgVol;
  const priceUp = close > prevClose;
  if (priceUp && volRatio > 1.5) {
    signals.push({ id: 'volume', type: 'buy', category: '量能', icon: '💪',
      title: '價漲量增', detail: `成交量達均量 ${(volRatio * 100).toFixed(0)}%，健康攻擊訊號` });
  } else if (!priceUp && volRatio > 1.5) {
    signals.push({ id: 'volume', type: 'warning', category: '量能', icon: '⚠️',
      title: '價跌量增', detail: `下跌伴隨放量 ${(volRatio * 100).toFixed(0)}%，賣壓較重` });
  } else if (priceUp && volRatio < 0.7) {
    signals.push({ id: 'volume', type: 'watch', category: '量能', icon: '👀',
      title: '價漲量縮', detail: `上漲量能不足 ${(volRatio * 100).toFixed(0)}%，動能待確認` });
  } else {
    signals.push({ id: 'volume', type: 'neutral', category: '量能', icon: 'ℹ️',
      title: '量能正常', detail: `成交量為均量的 ${(volRatio * 100).toFixed(0)}%` });
  }

  return signals;
}
