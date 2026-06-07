#!/usr/bin/env node
/**
 * StockIQ Health Check + Auto-Redeploy
 * Checks all critical endpoints. If any fail, triggers `vercel --prod`.
 */
import { execSync } from 'child_process';
import { appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(__dirname, '..');
const LOG_DIR = join(PROJECT_DIR, 'logs');
const LOG_FILE = join(LOG_DIR, 'healthcheck.log');
const BASE = 'https://stock-app-nine-woad.vercel.app';
const TIMEOUT_MS = 12000;

function log(msg) {
  const ts = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG_FILE, line + '\n');
  } catch {}
}

async function check(name, url, validate) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    const text = await res.text();
    const ok = validate(text, res);
    log(`${ok ? '✅' : '❌'} ${name}  [HTTP ${res.status}]`);
    if (!ok) log(`   └─ 回應預覽: ${text.slice(0, 120).replace(/\n/g, ' ')}`);
    return ok;
  } catch (err) {
    log(`❌ ${name}  [${err.name === 'AbortError' ? '逾時' : err.message}]`);
    return false;
  }
}

log('════════════ Health Check 開始 ════════════');

const results = await Promise.all([

  check(
    'Frontend (HTML)',
    BASE,
    (text, res) =>
      res.headers.get('content-type')?.includes('html') && text.includes('<div')
  ),

  check(
    'TWSE API (本益比表)',
    `${BASE}/api/twse/v1/exchangeReport/BWIBBU_ALL`,
    (text) => text.trimStart().startsWith('[') || text.trimStart().startsWith('{')
  ),

  check(
    'TPEX API (上櫃本益比)',
    `${BASE}/api/tpex/openapi/v1/tpex_mainboard_peratio_analysis`,
    (text, res) => res.ok && text.length > 10
  ),

  check(
    'Yahoo Finance API (2330)',
    `${BASE}/api/yahoo/v8/finance/chart/2330.TW?interval=1d&range=5d`,
    (text) => text.includes('"chart"') && text.includes('result')
  ),

  check(
    'Groq API (連線)',
    `${BASE}/api/groq/openai/v1/models`,
    (text, res) => res.status !== 502 && res.status !== 503 && !text.includes('<!doctype')
  ),

]);

const passed = results.filter(Boolean).length;
const total = results.length;
log(`\n結果：${passed}/${total} 通過`);

if (passed < total) {
  log(`⚠️  發現問題，開始觸發 Redeploy…`);
  try {
    execSync('npx vercel --prod', {
      cwd: PROJECT_DIR,
      stdio: 'inherit',
      timeout: 300_000,
    });
    log('✅ Redeploy 完成');
  } catch (err) {
    log(`❌ Redeploy 失敗：${err.message}`);
    process.exit(1);
  }
} else {
  log('✅ 全部正常，無需修復');
}

log('════════════ Health Check 結束 ════════════\n');
