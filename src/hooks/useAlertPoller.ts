import { useEffect, useRef } from 'react';
import { fetchQuote } from '../services/yahooFinance';
import type { AlertItem } from './useAlerts';

const POLL_MS = 2 * 60 * 1000; // 2 minutes

export function useAlertPoller(
  alerts: AlertItem[],
  onFire: (alert: AlertItem, direction: 'high' | 'low', price: number) => void,
) {
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;
  const onFireRef = useRef(onFire);
  onFireRef.current = onFire;

  useEffect(() => {
    const poll = async () => {
      const active = alertsRef.current.filter(
        a => a.enabled && ((a.high != null && !a.firedHigh) || (a.low != null && !a.firedLow))
      );
      if (active.length === 0) return;

      await Promise.all(active.map(async a => {
        try {
          const q = await fetchQuote(a.symbol);
          if (!q) return;
          if (a.high != null && !a.firedHigh && q.price >= a.high) onFireRef.current(a, 'high', q.price);
          if (a.low  != null && !a.firedLow  && q.price <= a.low)  onFireRef.current(a, 'low',  q.price);
        } catch { /* ignore network errors */ }
      }));
    };

    poll(); // check immediately on mount
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, []);
}
