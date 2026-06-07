import type { NewsItem } from './yahooNews';

function hasChinese(s: string): boolean {
  return /[一-龥]/.test(s);
}

function buildQuery(symbol: string, symbolName: string): string {
  const code = symbol.replace(/\.TWO?$/i, '');
  if (symbolName && hasChinese(symbolName)) {
    return `${symbolName} ${code}`;
  }
  // Name is English (e.g. not yet resolved) — search by code only
  return code;
}

function parseRSS(xml: string, symbol: string, symbolName: string): NewsItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const items = Array.from(doc.querySelectorAll('item'));

  return items
    .map(item => {
      const title = item.querySelector('title')?.textContent?.trim() ?? '';
      const link = item.querySelector('link')?.textContent?.trim() ?? '';
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() ?? '';
      const source = item.querySelector('source')?.textContent?.trim() ?? '';
      if (!title || !link) return null;

      const providerPublishTime = pubDate
        ? Math.floor(new Date(pubDate).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      // Use the unique article ID embedded in the Google News URL (last path segment)
      const articleId = link.split('/').pop()?.split('?')[0] ?? '';
      const uuid = articleId.length > 8 ? articleId.slice(-32) : btoa(encodeURIComponent(link)).slice(-32);

      return {
        uuid,
        title,
        publisher: source,
        link,
        providerPublishTime,
        symbol,
        symbolName,
      } satisfies NewsItem;
    })
    .filter((n): n is NewsItem => n !== null);
}

export async function fetchGoogleNewsForSymbol(
  symbol: string,
  symbolName: string,
): Promise<NewsItem[]> {
  const q = encodeURIComponent(buildQuery(symbol, symbolName));
  const url = `/api/gnews/rss/search?q=${q}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml, symbol, symbolName);
  } catch {
    return [];
  }
}
