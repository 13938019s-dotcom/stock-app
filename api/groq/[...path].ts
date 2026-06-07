import { makeProxy } from '../_proxy.js';
export const config = { runtime: 'edge' };
export default makeProxy('https://api.groq.com');
