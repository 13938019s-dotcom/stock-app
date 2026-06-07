export const config = { runtime: 'edge' };
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const subPath = url.searchParams.get('__p') || '';
  url.searchParams.delete('__p');
  const auth = req.headers.get('Authorization');
  const ct = req.headers.get('Content-Type');
  const upstream = await fetch(`https://api.groq.com/${subPath}${url.search}`, {
    method: req.method,
    headers: {
      'Accept': '*/*',
      ...(auth ? { 'Authorization': auth } : {}),
      ...(ct ? { 'Content-Type': ct } : {}),
    },
    body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
  });
  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
  });
}
