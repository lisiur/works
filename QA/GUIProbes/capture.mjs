/**
 * AC7 截图采集探针（ISSUE-129）：对构建产物起零依赖静态服务，
 * 用本机 headless Chrome 对全部页面在 1440 / 390 两档宽度各截一图（768px 断点两侧）。
 * 用法：node QA/GUIProbes/capture.mjs <dist 目录> <输出目录>
 * 页面清单由语言登记 + 应用文案模块 + 页面模板推导（同 verify-links）。
 * 说明：站点样式不含 prefers-color-scheme 查询——明暗由页面自身设计决定
 *（深色页 + light-bg 页），不存在「同一页面双配色」轴，故不做配色矩阵。
 */
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.resolve(process.argv[2] ?? path.join(ROOT, 'dist'));
const OUT = path.resolve(process.argv[3] ?? path.join(ROOT, 'QA', 'GUIProbes', 'shots'));
const PORT = 4199;
const WIDTHS = [1440, 390];
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ── 页面清单推导（与 scripts/verify-links.mjs 同口径）──
const SRC = path.join(ROOT, 'src');
const registry = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n', 'locales.json'), 'utf8'));
const locales = registry.map((entry) => entry.code);
const appIds = fs
  .readdirSync(path.join(SRC, 'i18n', 'copy', 'apps'))
  .filter((f) => f.endsWith('.ts'))
  .map((f) => f.replace(/\.ts$/, ''))
  .sort();

const pages = [{ html: 'index.html', url: '/' }];
for (const locale of locales) pages.push({ html: `${locale}/index.html`, url: `/${locale}/` });
for (const appId of appIds) pages.push({ html: `${appId}/index.html`, url: `/${appId}/` });
for (const appId of appIds) {
  for (const page of fs.readdirSync(path.join(SRC, 'pages', '[locale]', appId)).filter((f) => f.endsWith('.astro'))) {
    const name = page.replace(/\.astro$/, '');
    for (const locale of locales) {
      pages.push({
        html: name === 'index' ? `${locale}/${appId}/index.html` : `${locale}/${appId}/${name}.html`,
        url: name === 'index' ? `/${locale}/${appId}/` : `/${locale}/${appId}/${name}.html`,
      });
    }
  }
}

// 每次运行独立的临时 profile：避免与本机正在运行的 Chrome 共享默认 profile 导致挂起
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gui-probe-chrome-'));

// ── 零依赖静态服务 ──
const MIME = { '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const target = urlPath.endsWith('/') ? path.join(DIST, urlPath, 'index.html') : path.join(DIST, urlPath);
  if (!target.startsWith(DIST) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(target)] ?? MIME[''] });
  res.end(fs.readFileSync(target));
});
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const page of pages) {
  const slug = page.html === 'index.html' ? 'root' : page.html.replace(/\.html$/, '').replace(/\//g, '__');
  for (const width of WIDTHS) {
    const out = path.join(OUT, `${slug}__w${width}.png`);
    execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
      `--user-data-dir=${profileDir}`,
      '--timeout=15000',
      `--window-size=${width},900`,
      `--screenshot=${out}`,
      `http://127.0.0.1:${PORT}${page.url}`,
    ], { stdio: 'pipe' });
    n++;
    console.log(`  ok  ${slug} @ ${width}`);
  }
}
server.close();
console.log(`CAPTURE DONE: ${n} screenshots → ${OUT}`);
