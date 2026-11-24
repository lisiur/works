/**
 * 语言跳转行为自测（ISSUE-124 T6，迁移自 .opencode/test-redirect.js 口径）：
 * 从 dist 的 /index.html 与 /flashnote/index.html 抽 <head> 内联脚本，
 * 断言两段逐字节一致（AC2）；mock navigator / localStorage / location.replace
 * 跑现状 23 条用例 + 4 条相对目标解析；再断言 8 个内容页不含任何 <script>（AC3）。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

function extractScript(file) {
  const html = fs.readFileSync(path.join(DIST, file), 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no inline <script> found in ' + file);
  return m[1];
}

function runScript(source, opts) {
  const { memory = null, languages, language, storageBroken = false } = opts;
  const targets = [];
  const sandbox = {
    navigator: { languages, language },
    location: { replace: (t) => targets.push(t) },
  };
  if (storageBroken) {
    Object.defineProperty(sandbox, 'localStorage', {
      get() { throw new Error('localStorage blocked'); },
    });
  } else {
    const store = Object.assign({}, memory ? { 'hapaul-lang': memory } : {});
    sandbox.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
    };
  }
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  if (targets.length !== 1) throw new Error('expected exactly 1 location.replace, got ' + targets.length);
  return targets[0];
}

const failures = [];
function check(name, ok, detail = '') {
  if (ok) { console.log(`  ok  ${name}`); }
  else { failures.push(name); console.log(`FAIL  ${name} ${detail}`); }
}

const siteScript = extractScript('index.html');
const appScript = extractScript('flashnote/index.html');

// AC2：两个跳转页必须嵌同一段脚本
check('AC2: 站点根与应用根跳转脚本逐字节一致', siteScript === appScript);

const siteCases = [
  // [name, {memory, languages, language, storageBroken}, expected target]
  ['no memory, browser en → en-US', { languages: ['en-US', 'en'], language: 'en-US' }, 'en-US/'],
  ['no memory, browser ja → en-US', { languages: ['ja-JP', 'ja'], language: 'ja-JP' }, 'en-US/'],
  ['no memory, browser zh-CN → zh-CN', { languages: ['zh-CN', 'zh'], language: 'zh-CN' }, 'zh-CN/'],
  ['no memory, browser zh-TW → zh-CN', { languages: ['zh-TW'], language: 'zh-TW' }, 'zh-CN/'],
  ['zh first in list wins over later en', { languages: ['fr', 'zh-HK', 'en'], language: 'fr' }, 'zh-CN/'],
  ['any zh item in list wins (任一项命中)', { languages: ['en', 'zh-CN'], language: 'en' }, 'zh-CN/'],
  ['fallback to navigator.language when languages empty', { languages: [], language: 'zh-CN' }, 'zh-CN/'],
  ['fallback to navigator.language when languages missing', { languages: undefined, language: 'en' }, 'en-US/'],
  ['memory zh-CN beats browser en', { memory: 'zh-CN', languages: ['en-US'], language: 'en-US' }, 'zh-CN/'],
  ['memory en-US beats browser zh', { memory: 'en-US', languages: ['zh-CN'], language: 'zh-CN' }, 'en-US/'],
  ['invalid memory value ignored → browser zh', { memory: 'fr-FR', languages: ['zh-CN'], language: 'zh-CN' }, 'zh-CN/'],
  ['invalid memory value ignored → browser en', { memory: 'garbage', languages: ['en'], language: 'en' }, 'en-US/'],
  ['storage broken (privacy mode) → browser zh', { storageBroken: true, languages: ['zh-CN'], language: 'zh-CN' }, 'zh-CN/'],
  ['storage broken (privacy mode) → browser en', { storageBroken: true, languages: ['en'], language: 'en' }, 'en-US/'],
  ['empty language entries tolerated', { languages: ['', 'zh-TW'], language: '' }, 'zh-CN/'],
];

const appCases = [
  ['app root honors shared memory en-US', { memory: 'en-US', languages: ['zh-CN'], language: 'zh-CN' }, 'en-US/'],
  ['app root memory zh-CN', { memory: 'zh-CN', languages: ['en'], language: 'en' }, 'zh-CN/'],
  ['app root browser zh → zh-CN', { languages: ['zh-CN'], language: 'zh-CN' }, 'zh-CN/'],
  ['app root browser en → en-US', { languages: ['en'], language: 'en' }, 'en-US/'],
];

let pass = 0;
for (const [name, opts, expected] of siteCases) {
  const got = runScript(siteScript, opts);
  if (got === expected) { pass++; } else { failures.push('site: ' + name); console.log(`FAIL  site: ${name} → got ${got}, want ${expected}`); }
}
for (const [name, opts, expected] of appCases) {
  const got = runScript(appScript, opts);
  if (got === expected) { pass++; } else { failures.push('app: ' + name); console.log(`FAIL  app: ${name} → got ${got}, want ${expected}`); }
}

// 相对目标解析：站点根与应用根各落对位置
const resolve = (base, rel) => new URL(rel, base).pathname;
const resolveChecks = [
  ['site root + zh-CN/ resolves to /zh-CN/', resolve('https://apps.hapaul.top/', 'zh-CN/'), '/zh-CN/'],
  ['site root + en-US/ resolves to /en-US/', resolve('https://apps.hapaul.top/', 'en-US/'), '/en-US/'],
  ['app root + zh-CN/ resolves to /flashnote/zh-CN/', resolve('https://apps.hapaul.top/flashnote/', 'zh-CN/'), '/flashnote/zh-CN/'],
  ['app root + en-US/ resolves to /flashnote/en-US/', resolve('https://apps.hapaul.top/flashnote/', 'en-US/'), '/flashnote/en-US/'],
];
for (const [name, got, expected] of resolveChecks) {
  if (got === expected) { pass++; } else { failures.push('resolve: ' + name); console.log(`FAIL  resolve: ${name} → ${got}`); }
}
check(`AC2: ${siteCases.length + appCases.length} 条跳转用例 + ${resolveChecks.length} 条解析用例全过`,
  pass === siteCases.length + appCases.length + resolveChecks.length);

// AC3：探测只发生在两个跳转页，8 个内容页不含任何 <script>
const contentPages = [
  'zh-CN/index.html',
  'en-US/index.html',
  'flashnote/zh-CN/index.html',
  'flashnote/zh-CN/privacy.html',
  'flashnote/zh-CN/support.html',
  'flashnote/en-US/index.html',
  'flashnote/en-US/privacy.html',
  'flashnote/en-US/support.html',
];
for (const file of contentPages) {
  const body = fs.readFileSync(path.join(DIST, file), 'utf8');
  check(`AC3: /${file} 不含 <script>`, !body.includes('<script'));
}

// AC4：禁 JS 兜底——两个跳转页呈现双语手动入口，落点为页面自身目录下的双语首页
const jumpExpectations = [
  ['index.html', ['href="/zh-CN/">中文', 'href="/en-US/">English']],
  ['flashnote/index.html', ['href="/flashnote/zh-CN/">中文', 'href="/flashnote/en-US/">English']],
];
for (const [file, expects] of jumpExpectations) {
  const body = fs.readFileSync(path.join(DIST, file), 'utf8');
  for (const want of expects) {
    check(`AC4: /${file} 禁 JS 入口 ${want}`, body.includes(want));
  }
}

console.log();
if (failures.length) {
  console.log(`VERIFY-REDIRECT FAILED: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('VERIFY-REDIRECT PASSED: all checks green');
