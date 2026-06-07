export const config = { runtime: 'edge' };
export default function handler(req: Request) {
  return new Response(JSON.stringify({ ok: true, path: new URL(req.url).pathname }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
