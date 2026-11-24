/**
 * 语言跳转行为自测（ISSUE-124 T6，迁移自 .opencode/test-redirect.js 口径；
 * 验收反馈返工：地址改 locale 前置全局路径，跳转脚本落地段参数化 HAPUAL_JUMP_PATH）：
 * 从 dist 的 /index.html 与 /flashnote/index.html 抽 <head> 内联脚本，
 * 断言判定逻辑逐字节一致（AC2）+ 各自落地段正确；
 * mock navigator / localStorage / location.replace 跑现状 23 条用例 + 相对目标解析；
 * 再断言 8 个内容页不含任何 <script>（AC3）、跳转页禁 JS 双入口（AC4）。
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

/** 跳过落地段声明行，取判定逻辑（两页必须逐字节一致） */
function logicOf(script) {
  const lines = script.split('\n');
  const decl = lines[0];
  if (!/^var HAPUAL_JUMP_PATH = '/.test(decl)) {
    throw new Error('expected HAPUAL_JUMP_PATH declaration on line 1, got: ' + decl);
  }
  return { decl, logic: lines.slice(1).join('\n') };
}

function runScript(source) {
  const targets = [];
  const sandbox = {
    navigator: {},
    location: { replace: (t) => targets.push(t) },
    localStorage: { getItem: () => null, setItem: () => {} },
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return { targets, sandbox };
}

/** 在指定探测条件下跑脚本，返回 location.replace 的目标 */
function runCase(source, opts) {
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
const site = logicOf(siteScript);
const app = logicOf(appScript);

// AC2：两个跳转页的判定逻辑必须逐字节一致；落地段各自正确
check('AC2: 站点根与应用根跳转判定逻辑逐字节一致', site.logic === app.logic);
check('AC2: 站点根落地段为空（落 /<语言>/）', site.decl === `var HAPUAL_JUMP_PATH = '';`);
check('AC2: 应用根落地段为 /flashnote（落 /<语言>/flashnote/）', app.decl === `var HAPUAL_JUMP_PATH = '/flashnote';`);

// 23 条用例（判定顺序：记忆 > navigator.languages 任一项 zh 开头 > 其余 en-US；
// languages 空/缺省回退 navigator.language；localStorage 不可用静默）。
// 站点根落 /<语言>/，应用根落 /<语言>/flashnote/。
const siteCases = [
  ['no memory, browser en → /en-US/', { languages: ['en-US', 'en'], language: 'en-US' }, '/en-US/'],
  ['no memory, browser ja → /en-US/', { languages: ['ja-JP', 'ja'], language: 'ja-JP' }, '/en-US/'],
  ['no memory, browser zh-CN → /zh-CN/', { languages: ['zh-CN', 'zh'], language: 'zh-CN' }, '/zh-CN/'],
  ['no memory, browser zh-TW → /zh-CN/', { languages: ['zh-TW'], language: 'zh-TW' }, '/zh-CN/'],
  ['zh first in list wins over later en', { languages: ['fr', 'zh-HK', 'en'], language: 'fr' }, '/zh-CN/'],
  ['any zh item in list wins (任一项命中)', { languages: ['en', 'zh-CN'], language: 'en' }, '/zh-CN/'],
  ['fallback to navigator.language when languages empty', { languages: [], language: 'zh-CN' }, '/zh-CN/'],
  ['fallback to navigator.language when languages missing', { languages: undefined, language: 'en' }, '/en-US/'],
  ['memory zh-CN beats browser en', { memory: 'zh-CN', languages: ['en-US'], language: 'en-US' }, '/zh-CN/'],
  ['memory en-US beats browser zh', { memory: 'en-US', languages: ['zh-CN'], language: 'zh-CN' }, '/en-US/'],
  ['invalid memory value ignored → browser zh', { memory: 'fr-FR', languages: ['zh-CN'], language: 'zh-CN' }, '/zh-CN/'],
  ['invalid memory value ignored → browser en', { memory: 'garbage', languages: ['en'], language: 'en' }, '/en-US/'],
  ['storage broken (privacy mode) → browser zh', { storageBroken: true, languages: ['zh-CN'], language: 'zh-CN' }, '/zh-CN/'],
  ['storage broken (privacy mode) → browser en', { storageBroken: true, languages: ['en'], language: 'en' }, '/en-US/'],
  ['empty language entries tolerated', { languages: ['', 'zh-TW'], language: '' }, '/zh-CN/'],
];

const appCases = [
  ['app root honors shared memory en-US', { memory: 'en-US', languages: ['zh-CN'], language: 'zh-CN' }, '/en-US/flashnote/'],
  ['app root memory zh-CN', { memory: 'zh-CN', languages: ['en'], language: 'en' }, '/zh-CN/flashnote/'],
  ['app root browser zh → /zh-CN/flashnote/', { languages: ['zh-CN'], language: 'zh-CN' }, '/zh-CN/flashnote/'],
  ['app root browser en → /en-US/flashnote/', { languages: ['en'], language: 'en' }, '/en-US/flashnote/'],
];

let pass = 0;
for (const [name, opts, expected] of siteCases) {
  const got = runCase(siteScript, opts);
  if (got === expected) { pass++; } else { failures.push('site: ' + name); console.log(`FAIL  site: ${name} → got ${got}, want ${expected}`); }
}
for (const [name, opts, expected] of appCases) {
  const got = runCase(appScript, opts);
  if (got === expected) { pass++; } else { failures.push('app: ' + name); console.log(`FAIL  app: ${name} → got ${got}, want ${expected}`); }
}

// 落地为根绝对路径：目标与发起页地址形态无关（/flashnote/ 与 /flashnote/index.html 同落点）
const resolveChecks = [
  ['app script target is root-absolute (/zh-CN/flashnote/)', runCase(appScript, { languages: ['zh-CN'], language: 'zh-CN' }).startsWith('/'), true],
  ['site script target is root-absolute (/zh-CN/)', runCase(siteScript, { languages: ['zh-CN'], language: 'zh-CN' }).startsWith('/'), true],
];
for (const [name, got, expected] of resolveChecks) {
  if (got === expected) { pass++; } else { failures.push('resolve: ' + name); console.log(`FAIL  resolve: ${name} → ${got}`); }
}
check(`AC2: ${siteCases.length + appCases.length} 条跳转用例 + ${resolveChecks.length} 条落地形态用例全过`,
  pass === siteCases.length + appCases.length + resolveChecks.length);

// AC3：探测只发生在两个跳转页，8 个内容页不含任何 <script>
const contentPages = [
  'zh-CN/index.html',
  'en-US/index.html',
  'zh-CN/flashnote/index.html',
  'zh-CN/flashnote/privacy.html',
  'zh-CN/flashnote/support.html',
  'en-US/flashnote/index.html',
  'en-US/flashnote/privacy.html',
  'en-US/flashnote/support.html',
];
for (const file of contentPages) {
  const body = fs.readFileSync(path.join(DIST, file), 'utf8');
  check(`AC3: /${file} 不含 <script>`, !body.includes('<script'));
}

// AC4：禁 JS 兜底——两个跳转页呈现双语手动入口，落点为对应语言下的本应用/主站首页
const jumpExpectations = [
  ['index.html', ['href="/zh-CN/">中文', 'href="/en-US/">English']],
  ['flashnote/index.html', ['href="/zh-CN/flashnote/">中文', 'href="/en-US/flashnote/">English']],
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
