declare const process: { env: Record<string, string | undefined> };

export const config = { runtime: 'edge' };
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const subPath = url.searchParams.get('__p') || '';
  url.searchParams.delete('__p');
  const ct = req.headers.get('Content-Type');
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const upstream = await fetch(`https://api.groq.com/${subPath}${url.search}`, {
    method: req.method,
    headers: {
      'Accept': '*/*',
      'Authorization': `Bearer ${apiKey}`,
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
