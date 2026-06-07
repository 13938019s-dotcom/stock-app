export const config = { runtime: 'edge' };
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const subPath = url.searchParams.get('__p') || '';
  url.searchParams.delete('__p');
  const upstream = await fetch(`https://www.tpex.org.tw/${subPath}${url.search}`, {
    method: req.method,
    headers: { 'Accept': 'application/json' },
  });
  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
  });
}
