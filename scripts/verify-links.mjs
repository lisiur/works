/**
 * 产物级全量自测（ISSUE-124 T6 建立，ISSUE-129 T6 推导化）：
 * 对 dist/ 起零依赖静态服务（目录索引 + 404 语义），爬全部页面 href/src，
 * resolve + 剥 #fragment 后逐一请求，断言断链数 0；
 * 同时断言 AC1：恰好 10 个 HTML、12 种地址 200、旧地址 404。
 * 期望清单（HTML 集合、地址清单、sweep 页面集）由语言登记（src/i18n/locales.json）
 * + 应用文案模块文件名（src/i18n/copy/apps/）+ 页面模板（src/pages/[locale]/<app>/）
 * 推导，接语言 / 接应用不再需要同步本脚本；唯一手写项是历史下线地址 `gone`。
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}/`;

// ── 期望清单推导 ──
const registry = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n', 'locales.json'), 'utf8'));
const locales = registry.map((entry) => entry.code);
const appIds = fs
  .readdirSync(path.join(SRC, 'i18n', 'copy', 'apps'))
  .filter((f) => f.endsWith('.ts'))
  .map((f) => f.replace(/\.ts$/, ''))
  .sort();

/** 应用页面模板清单：src/pages/[locale]/<app>/*.astro */
function appTemplates(appId) {
  return fs
    .readdirSync(path.join(SRC, 'pages', '[locale]', appId))
    .filter((f) => f.endsWith('.astro'))
    .map((f) => f.replace(/\.astro$/, ''));
}

/** 期望 HTML 路径集合 + 每个文件的规范地址（build.format: 'preserve'——index 页目录形态，其余 .html 形态） */
const expectedPages = []; // { html, url }
expectedPages.push({ html: 'index.html', url: '/' });
for (const locale of locales) expectedPages.push({ html: `${locale}/index.html`, url: `/${locale}/` });
for (const appId of appIds) expectedPages.push({ html: `${appId}/index.html`, url: `/${appId}/` });
for (const appId of appIds) {
  for (const page of appTemplates(appId)) {
    for (const locale of locales) {
      if (page === 'index') {
        expectedPages.push({ html: `${locale}/${appId}/index.html`, url: `/${locale}/${appId}/` });
      } else {
        expectedPages.push({ html: `${locale}/${appId}/${page}.html`, url: `/${locale}/${appId}/${page}.html` });
      }
    }
  }
}

/** 期望 200 的地址清单：全部页面规范地址 + index 页附加的 .html 直写形态 */
const addresses = expectedPages.map((p) => p.url);
for (const p of expectedPages) {
  if (p.html.endsWith('/index.html') && p.html !== 'index.html') {
    addresses.push(`/${p.html}`);
  }
}

const failures = [];

function check(name, ok, detail = '') {
  if (ok) {
    console.log(`  ok  ${name}`);
  } else {
    failures.push(name);
    console.log(`FAIL  ${name} ${detail}`);
  }
}

// ── 静态服务：尾斜杠 → 目录 index.html；其余精确文件；不存在 → 404 ──
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '': 'application/octet-stream',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const target = urlPath.endsWith('/')
    ? path.join(DIST, urlPath, 'index.html')
    : path.join(DIST, urlPath);
  if (!target.startsWith(DIST) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(target)] ?? MIME[''] });
  res.end(fs.readFileSync(target));
});

function fetch(pathname) {
  return new Promise((resolve, reject) => {
    http.get(BASE + pathname.replace(/^\//, ''), { headers: { 'User-Agent': 'verify-links/1.0' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    }).on('error', reject);
  });
}

// ── AC1: 产物 HTML 集合与推导清单一致 ──
function listHtml(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listHtml(full));
    else if (entry.name.endsWith('.html')) out.push(path.relative(DIST, full));
  }
  return out;
}

const serverReady = new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
await serverReady;

try {
  const htmlFiles = listHtml(DIST).sort();
  check(`AC1: dist 恰好 ${expectedPages.length} 个 HTML（实际 ${htmlFiles.length}）`, htmlFiles.length === expectedPages.length, htmlFiles.join(', '));

  const expectedSet = new Set(expectedPages.map((p) => p.html));
  check(
    'AC1: HTML 路径与页面清单（登记推导）一一对应',
    htmlFiles.every((f) => expectedSet.has(f)) && htmlFiles.length === expectedSet.size,
  );

  // ── AC1: 全部页面地址 200（locale 前置全局路径）──
  for (const addr of addresses) {
    try {
      const res = await fetch(addr);
      check(`AC1: ${addr} → ${res.status}`, res.status === 200);
    } catch (e) {
      check(`AC1: ${addr}`, false, String(e));
    }
  }

  // ── AC1: 已下线旧地址仍 404（ISSUE-119 集合 + 重构前旧样式路径 + locale 前置改版前的
  // /<app>/<locale>/ 旧页面地址 —— 验收拍板「无须兼容」，一律 404 不做兼容跳转）──
  const gone = [
    '/en/', '/en/index.html', '/flashnote/en/', '/flashnote/en/privacy.html', '/zh/',
    '/styles.css', '/flashnote/styles.css',
    '/flashnote/zh-CN/', '/flashnote/zh-CN/index.html', '/flashnote/zh-CN/privacy.html', '/flashnote/zh-CN/support.html',
    '/flashnote/en-US/', '/flashnote/en-US/index.html', '/flashnote/en-US/privacy.html', '/flashnote/en-US/support.html',
  ];
  for (const addr of gone) {
    try {
      const res = await fetch(addr);
      check(`旧地址仍 404：${addr} → ${res.status}`, res.status === 404, `expected 404`);
    } catch (e) {
      check(`旧地址仍 404：${addr}`, false, String(e));
    }
  }

  // ── AC6: 全量资源 sweep（剥 fragment、跳过外链；页面集 = 全部期望页面）──
  const ATTR = /(?:href|src)="([^"]+)"/g;
  const SKIP = ['http://', 'https://', 'mailto:', '#'];
  const broken = [];
  const checked = new Set();
  for (const page of expectedPages) {
    const body = fs.readFileSync(path.join(DIST, page.html), 'utf8');
    for (const raw of body.matchAll(ATTR)) {
      const ref = raw[1];
      if (SKIP.some((p) => ref.startsWith(p))) continue;
      const resolved = new URL(ref, new URL(page.url, BASE));
      resolved.hash = '';
      const target = resolved.pathname + resolved.search;
      if (checked.has(target)) continue;
      checked.add(target);
      try {
        const res = await fetch(target);
        if (res.status !== 200) broken.push(`${ref} (on ${page.url}) → ${res.status}`);
      } catch (e) {
        broken.push(`${ref} (on ${page.url}) → ${String(e)}`);
      }
    }
  }
  check(`全量资源 sweep：${checked.size} 个唯一本地引用全部可达，断链 0`, broken.length === 0, broken.join('; '));
} finally {
  server.close();
}

console.log();
if (failures.length) {
  console.log(`VERIFY-LINKS FAILED: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('VERIFY-LINKS PASSED: all checks green');
