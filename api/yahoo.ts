export const config = { runtime: 'edge' };
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const subPath = url.searchParams.get('__p') || '';
  url.searchParams.delete('__p');
  const upstream = await fetch(`https://query1.finance.yahoo.com/${subPath}${url.search}`, {
    method: req.method,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
  });
}
