// Yahoo Finance proxy - v2
import { makeProxy } from '../_proxy.js';
export const config = { runtime: 'edge' };
export default makeProxy('https://query1.finance.yahoo.com', {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
});
