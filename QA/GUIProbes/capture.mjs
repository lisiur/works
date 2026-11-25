/**
 * AC7 截图采集探针（ISSUE-129）：对构建产物起静态服务，
 * 用本机 headless Chrome 对全部页面在 1440 / 390 两档宽度各截一图（768px 断点两侧）。
 * 用法：node QA/GUIProbes/capture.mjs <dist 目录> <输出目录>
 * 页面清单由语言登记 + 应用文案模块 + 页面模板推导（同 verify-links）。
 *
 * 环境适配（ISSUE-129 AC7 实测踩坑记录）：
 * - Chrome 加 `--no-proxy-server`：headless 会继承 macOS 系统代理，
 *   对 127.0.0.1 的请求可能被代理黑洞，页面永远加载不完；
 * - 静态服务用 `python3 -m http.server`（HTTP/1.0、每请求关连、带 Content-Length）：
 *   自写的极简 Node 静态服务器与 headless=new 的 Chrome 存在兼容问题（页面加载不结束，
 *   Chrome 不退出），python stdlib 服务器实测秒级完成；
 * - Chrome 用独立临时 profile（mkdtemp），避免与本机正在运行的 Chrome 共用默认 profile；
 * - 每张截图 20s 超时保护，失败即报错退出，不无限挂起。
 *
 * 说明：站点样式不含 prefers-color-scheme 查询——明暗由页面自身设计决定
 *（深色页 + light-bg 页），不存在「同一页面双配色」轴，故不做配色矩阵。
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.resolve(process.argv[2] ?? path.join(ROOT, 'dist'));
const OUT = path.resolve(process.argv[3] ?? path.join(ROOT, 'QA', 'GUIProbes', 'shots'));
const PORT = 4199;
const WIDTHS = [1440, 390];
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SHOT_TIMEOUT_MS = 20000;

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error(`CAPTURE FAILED: ${DIST} 下没有 index.html（先 pnpm build）`);
  process.exit(1);
}

// ── 页面清单推导（与 scripts/verify-links.mjs 同口径）──
const SRC = path.join(ROOT, 'src');
const registry = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n', 'locales.json'), 'utf8'));
const locales = registry.map((entry) => entry.code);
const appIds = fs
  .readdirSync(path.join(SRC, 'i18n', 'messages', 'apps'))
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

// ── 静态服务：python3 stdlib（与本机 headless Chrome 实测兼容）──
const python = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', DIST], {
  stdio: 'ignore',
});

async function waitPortReady(port, tries = 50) {
  for (let i = 0; i < tries; i++) {
    const ok = await new Promise((resolve) => {
      const sock = net.connect({ port, host: '127.0.0.1' });
      sock.on('connect', () => { sock.destroy(); resolve(true); });
      sock.on('error', () => resolve(false));
    });
    if (ok) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`静态服务端口 ${port} 未就绪`);
}

function waitForExit(child) {
  return new Promise((resolve) => child.on('exit', resolve));
}

try {
  await waitPortReady(PORT);
  fs.mkdirSync(OUT, { recursive: true });
  // 每次运行独立的临时 profile：避免与本机正在运行的 Chrome 共用默认 profile 导致挂起
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gui-probe-chrome-'));
  let n = 0;
  for (const page of pages) {
    const slug = page.html === 'index.html' ? 'root' : page.html.replace(/\.html$/, '').replace(/\//g, '__');
    for (const width of WIDTHS) {
      const out = path.join(OUT, `${slug}__w${width}.png`);
      try {
        execFileSync(CHROME, [
          '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-proxy-server',
          `--user-data-dir=${profileDir}`,
          `--window-size=${width},900`,
          `--screenshot=${out}`,
          `http://127.0.0.1:${PORT}${page.url}`,
        ], { stdio: 'pipe', timeout: SHOT_TIMEOUT_MS });
      } catch (e) {
        console.error(`CAPTURE FAILED: ${slug} @ ${width} 超时或失败（${SHOT_TIMEOUT_MS}ms 上限）：${e.message}`);
        process.exit(1);
      }
      n++;
      console.log(`  ok  ${slug} @ ${width}`);
    }
  }
  console.log(`CAPTURE DONE: ${n} screenshots → ${OUT}`);
} finally {
  python.kill();
  await waitForExit(python);
}
