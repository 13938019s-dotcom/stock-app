export const config = { runtime: 'edge' };

const TARGETS: Record<string, string> = {
  yahoo:   'https://query1.finance.yahoo.com',
  twse:    'https://www.twse.com.tw',
  tpex:    'https://www.tpex.org.tw',
  finmind: 'https://api.finmindtrade.com',
  groq:    'https://api.groq.com',
  gnews:   'https://news.google.com',
};

const EXTRA: Record<string, Record<string, string>> = {
  yahoo:   { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'application/json' },
  gnews:   { 'Accept': 'application/rss+xml, application/xml, text/xml', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  finmind: { 'Accept': 'application/json' },
  tpex:    { 'Accept': 'application/json' },
  twse:    {},
  groq:    {},
};

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parts = url.pathname.split('/'); // ['', 'api', service, ...rest]
  const service = parts[2];
  const target = TARGETS[service];

  if (!target) {
    return new Response('Unknown service', { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const subPath = '/' + parts.slice(3).join('/');
  const targetUrl = `${target}${subPath}${url.search}`;

  const fwdHeaders: Record<string, string> = { 'Accept': '*/*', ...EXTRA[service] };
  const auth = req.headers.get('Authorization');
  const ct   = req.headers.get('Content-Type');
  if (auth) fwdHeaders['Authorization'] = auth;
  if (ct)   fwdHeaders['Content-Type']   = ct;

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? await req.text() : undefined;

  const upstream = await fetch(targetUrl, { method: req.method, headers: fwdHeaders, body });
  const responseBody = await upstream.arrayBuffer();

  return new Response(responseBody, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}
