export interface InstitutionalDay {
  date: string;    // YYYY-MM-DD
  foreign: number; // 外資 net (千股 = 張)
  trust: number;   // 投信 net
  dealer: number;  // 自營商 net
  total: number;   // 三大法人合計
}

function parseNum(v: unknown): number {
  if (typeof v === 'number') return isNaN(v) ? 0 : Math.round(v);
  const n = parseInt(String(v ?? '').replace(/,/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

export async function fetchInstitutional(code: string): Promise<InstitutionalDay[]> {
  const start = new Date();
  start.setDate(start.getDate() - 90); // fetch ~3 months
  const startStr = start.toISOString().slice(0, 10);

  const url = `/api/finmind/api/v4/data?dataset=TaiwanStockInstitutionalInvestorsBuySell&data_id=${code}&start_date=${startStr}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    if (!Array.isArray(json.data) || json.data.length === 0) return [];

    // Log the first row to see actual field names
    console.log('[finmind] first row:', JSON.stringify(json.data[0]));

    const byDate: Record<string, InstitutionalDay> = {};

    for (const row of json.data as any[]) {
      const date: string = row.date ?? '';
      if (!date) continue;
      if (!byDate[date]) byDate[date] = { date, foreign: 0, trust: 0, dealer: 0, total: 0 };

      const name = String(row.name ?? '');
      // diff field might be named differently; fall back to buy - sell
      const diff = parseNum(row.diff ?? row.Diff ?? row.net ?? ((parseNum(row.buy) - parseNum(row.sell)) || 0));

      if (name.includes('外') || name.toLowerCase().includes('foreign')) {
        byDate[date].foreign = diff;
      } else if (name.includes('投信') || name.toLowerCase().includes('trust')) {
        byDate[date].trust = diff;
      } else if (name.includes('自營') || name.toLowerCase().includes('dealer')) {
        byDate[date].dealer += diff;
      }
    }

    return Object.values(byDate)
      .map(d => ({ ...d, total: d.foreign + d.trust + d.dealer }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-60);
  } catch {
    return [];
  }
}
