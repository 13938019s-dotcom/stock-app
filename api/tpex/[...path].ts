import { makeProxy } from '../_proxy.js';
export const config = { runtime: 'edge' };
export default makeProxy('https://www.tpex.org.tw', {
  'Accept': 'application/json',
});
