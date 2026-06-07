export function makeProxy(
  target: string,
  extraHeaders: Record<string, string> = {},
) {
  return async function handler(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Strip /api/{service} prefix to get the downstream path
    const subPath = url.pathname.replace(/^\/api\/[^/]+/, '') || '/';
    const targetUrl = `${target}${subPath}${url.search}`;

    // Forward relevant headers
    const fwdHeaders: Record<string, string> = { 'Accept': '*/*', ...extraHeaders };
    const auth = req.headers.get('Authorization');
    const ct   = req.headers.get('Content-Type');
    if (auth) fwdHeaders['Authorization'] = auth;
    if (ct)   fwdHeaders['Content-Type']   = ct;

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const body = hasBody ? await req.text() : undefined;

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: fwdHeaders,
      body,
    });

    const responseBody = await upstream.arrayBuffer();
    return new Response(responseBody, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
      },
    });
  };
}
