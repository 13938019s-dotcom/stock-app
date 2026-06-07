export const config = { runtime: 'edge' };
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const subPath = url.searchParams.get('__p') || '';
  url.searchParams.delete('__p');
  const auth = req.headers.get('Authorization');
  const upstream = await fetch(`https://api.finmindtrade.com/${subPath}${url.search}`, {
    method: req.method,
    headers: { 'Accept': 'application/json', ...(auth ? { 'Authorization': auth } : {}) },
    body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
  });
  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
  });
}
