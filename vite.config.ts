import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  server: {
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/yahoo/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      },
      '/api/twse': {
        target: 'https://openapi.twse.com.tw',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/twse/, ''),
        headers: { 'Accept': 'application/json' },
      },
      '/api/twse-www': {
        target: 'https://www.twse.com.tw',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/twse-www/, ''),
        headers: { 'Accept': 'application/json', 'Referer': 'https://www.twse.com.tw/' },
      },
      '/api/tpex': {
        target: 'https://www.tpex.org.tw',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/tpex/, ''),
        headers: { 'Accept': 'application/json' },
      },
      '/api/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/gemini/, ''),
      },
      '/api/groq': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/groq/, ''),
      },
      '/api/finmind': {
        target: 'https://api.finmindtrade.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/finmind/, ''),
        headers: { 'Accept': 'application/json' },
      },
      '/api/gnews': {
        target: 'https://news.google.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/gnews/, ''),
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      },
    },
  },
});
