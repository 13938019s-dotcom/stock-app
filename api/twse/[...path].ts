import { makeProxy } from '../_proxy.js';
export const config = { runtime: 'edge' };
export default makeProxy('https://openapi.twse.com.tw', {
  'Accept': 'application/json',
});
