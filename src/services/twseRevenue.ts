export interface MonthRevenue {
  date: string;          // YYYY-MM-DD (revenue month)
  revenue: number;       // 千元
  yoyGrowth: number | null; // %
}

export async function fetchMonthRevenue(code: string): Promise<MonthRevenue[]> {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 3); // 3 years for YoY calc
  const startStr = start.toISOString().slice(0, 10);

  try {
    const res = await fetch(
      `/api/finmind/api/v4/data?dataset=TaiwanStockMonthRevenue&data_id=${code}&start_date=${startStr}`
    );
    if (!res.ok) return [];
    const json = await res.json();
    if (!Array.isArray(json.data) || json.data.length === 0) return [];

    const sorted = [...json.data].sort((a: any, b: any) =>
      String(a.date).localeCompare(String(b.date))
    );

    const result: MonthRevenue[] = sorted.map((row: any) => {
      const revenue = Number(row.revenue ?? 0);
      const date = String(row.date ?? '');
      const year = parseInt(date.slice(0, 4));
      const month = date.slice(5, 7);
      const lyRow = sorted.find((r: any) => String(r.date ?? '').startsWith(`${year - 1}-${month}`));
      const lyRevenue = lyRow ? Number(lyRow.revenue ?? 0) : null;
      const yoyGrowth = lyRevenue && lyRevenue > 0
        ? +((revenue - lyRevenue) / lyRevenue * 100).toFixed(1)
        : null;
      return { date, revenue, yoyGrowth };
    });

    return result.slice(-24);
  } catch {
    return [];
  }
}
