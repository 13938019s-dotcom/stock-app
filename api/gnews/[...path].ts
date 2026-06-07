import { makeProxy } from '../_proxy.js';
export const config = { runtime: 'edge' };
export default makeProxy('https://news.google.com', {
  'Accept': 'application/rss+xml, application/xml, text/xml',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
});
