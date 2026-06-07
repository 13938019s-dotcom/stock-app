export interface NewsItem {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number; // Unix seconds
  symbol: string;
  symbolName: string;
}

export async function fetchNewsForSymbol(ticker: string, symbolName: string): Promise<NewsItem[]> {
  const res = await fetch(
    `/api/yahoo/v1/finance/search?q=${encodeURIComponent(ticker)}&newsCount=20&enableFuzzyQuery=false`
  );
  if (!res.ok) return [];

  const json = await res.json();
  const raw: any[] = json.news ?? [];

  return raw
    .filter((n: any) => n.uuid && n.title && n.link && n.providerPublishTime)
    .map((n: any) => ({
      uuid: n.uuid,
      title: n.title,
      publisher: n.publisher ?? '',
      link: n.link,
      providerPublishTime: n.providerPublishTime,
      symbol: ticker,
      symbolName,
    }));
}

const THREE_MONTHS = 90 * 24 * 60 * 60; // seconds

export function isWithin3Days(ts: number): boolean {
  return Date.now() / 1000 - ts < THREE_MONTHS;
}

export function formatNewsTime(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diffHours = (now.getTime() - d.getTime()) / 3600000;
  if (diffHours < 1) return `${Math.round(diffHours * 60)} 分鐘前`;
  if (diffHours < 24) return `${Math.round(diffHours)} 小時前`;
  return `${Math.round(diffHours / 24)} 天前`;
}
