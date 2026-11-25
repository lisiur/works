/**
 * 语言跳转行为自测（ISSUE-124 T6 建立，ISSUE-129 T6 推导化）：
 * 从 dist 的跳转页（站点根 + 每个应用根）抽 <head> 内联脚本，
 * 断言判定逻辑逐字节一致（AC2）+ 各自落地段正确；
 * mock navigator / localStorage / location.replace 跑跳转用例矩阵 + 相对目标解析；
 * 再断言全部内容页不含任何 <script>（AC3）、跳转页禁 JS 手动入口（AC4）。
 *
 * 期望清单全部由语言登记（src/i18n/locales.json）+ 应用文案模块文件名推导：
 * 跳转页清单、落地段、用例矩阵的期望值、AC4 入口断言都随登记变化；
 * 用例期望值由本脚本的 decide()（候选序 × 登记序规则匹配 + 回退）模拟推导，
 * 与生成脚本必须语义等价——登记变化后两者同步成立才算通过。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

// ── 登记推导 ──
const registry = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n', 'locales.json'), 'utf8'));
const ruleLocales = registry.filter((entry) => entry.match);
const fallbackCode = registry.find((entry) => entry.fallback).code;
const codes = registry.map((entry) => entry.code);
const appIds = fs
  .readdirSync(path.join(SRC, 'i18n', 'copy', 'apps'))
  .filter((f) => f.endsWith('.ts'))
  .map((f) => f.replace(/\.ts$/, ''))
  .sort();

/** 跳转页：站点根 + 每个应用根（落地段） */
const jumpPages = [
  { file: 'index.html', segment: '' },
  ...appIds.map((appId) => ({ file: `${appId}/index.html`, segment: `/${appId}` })),
];

/** 内容页 = 全部期望 HTML − 跳转页（推导同 verify-links） */
const contentPages = [];
for (const locale of codes) contentPages.push(`${locale}/index.html`);
for (const appId of appIds) {
  const templates = fs
    .readdirSync(path.join(SRC, 'pages', '[locale]', appId))
    .filter((f) => f.endsWith('.astro'))
    .map((f) => f.replace(/\.astro$/, ''));
  for (const locale of codes) {
    for (const page of templates) {
      contentPages.push(page === 'index' ? `${locale}/${appId}/index.html` : `${locale}/${appId}/${page}.html`);
    }
  }
}

/** 登记语义的判定模拟：逐候选（偏好序）逐规则（登记序），全不命中落回退语言 */
function decide(candidates) {
  for (const candidate of candidates) {
    for (const entry of ruleLocales) {
      if (new RegExp(entry.match.source, entry.match.flags ?? '').test(candidate || '')) return entry.code;
    }
  }
  return fallbackCode;
}

function extractScript(file) {
  const html = fs.readFileSync(path.join(DIST, file), 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no inline <script> found in ' + file);
  return m[1];
}

/** 跳过落地段声明行，取判定逻辑（各跳转页必须逐字节一致） */
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

const scripts = jumpPages.map((page) => ({ ...page, script: extractScript(page.file) }));
const logics = scripts.map((page) => logicOf(page.script));

// AC2：全部跳转页的判定逻辑逐字节一致；落地段各自正确
const logic0 = logics[0].logic;
for (const page of scripts) {
  const { decl, logic } = logicOf(page.script);
  check(`AC2: ${page.file} 判定逻辑与站点根逐字节一致`, logic === logic0);
  check(`AC2: ${page.file} 落地段为 '${page.segment}'（落 /<语言>${page.segment}/）`, decl === `var HAPUAL_JUMP_PATH = '${page.segment}';`);
}

// ── 用例矩阵（期望值由登记语义 decide() 推导；样本浏览器串为固定夹具）──
// 结构（与基线 15 条语义一一对应 + 2 条对称补 + 每规则语言各 4 条）：
// ① 不带记忆按浏览器语言落地：规则语言（精确 code / 区域变体 / 列表任意项命中）与未命中语言落回退
// ② languages 空 / 缺省回退 navigator.language（命中与不命中各验）
// ③ 记忆优先于浏览器语言（每个登记 code 各一条）
// ④ 非法记忆值被忽略，落浏览器语言判定
// ⑤ localStorage 不可用（隐私模式）静默走浏览器语言
// ⑥ 空字符串候选条目被容忍
const otherSample = ['en-US', 'en'];       // 未命中任何规则的样本（登记不含 en 系时退化为回退）
const unrelatedSample = ['ja-JP', 'ja'];   // 与登记规则无关的样本
const siteCases = [
  ['no memory, browser en → fallback', { languages: otherSample, language: 'en-US' }, decide(otherSample)],
  ['no memory, browser ja → fallback/unrelated', { languages: unrelatedSample, language: 'ja-JP' }, decide(unrelatedSample)],
  ...ruleLocales.map((entry) => [
    `no memory, browser ${entry.code} → /${entry.code}/`,
    { languages: [entry.code, entry.code.split('-')[0]], language: entry.code },
    entry.code,
  ]),
  ...ruleLocales.map((entry) => [
    `no memory, browser region variant → /${entry.code}/`,
    { languages: [`${entry.code.split('-')[0]}-TW`], language: `${entry.code.split('-')[0]}-TW` },
    entry.code,
  ]),
  ...ruleLocales.map((entry) => [
    `${entry.code} first in list wins over later en`,
    { languages: ['fr', entry.code, 'en'], language: 'fr' },
    decide(['fr', entry.code, 'en']),
  ]),
  ...ruleLocales.map((entry) => [
    `any ${entry.code} item in list wins (任一项命中)`,
    { languages: ['en', entry.code], language: 'en' },
    decide(['en', entry.code]),
  ]),
  ['fallback to navigator.language when languages empty (hit)', { languages: [], language: ruleLocales[0].code }, decide([ruleLocales[0].code])],
  ['fallback to navigator.language when languages empty (miss)', { languages: [], language: 'en' }, decide(['en'])],
  ['fallback to navigator.language when languages missing (hit)', { languages: undefined, language: ruleLocales[0].code }, decide([ruleLocales[0].code])],
  ['fallback to navigator.language when languages missing (miss)', { languages: undefined, language: 'en' }, decide(['en'])],
  ...codes.map((code) => [
    `memory ${code} beats browser language`,
    { memory: code, languages: [ruleLocales[0].code], language: ruleLocales[0].code },
    code,
  ]),
  ['invalid memory value ignored → browser hit', { memory: 'fr-FR', languages: [ruleLocales[0].code], language: ruleLocales[0].code }, decide([ruleLocales[0].code])],
  ['invalid memory value ignored → browser miss', { memory: 'garbage', languages: ['en'], language: 'en' }, decide(['en'])],
  ['storage broken (privacy mode) → browser hit', { storageBroken: true, languages: [ruleLocales[0].code], language: ruleLocales[0].code }, decide([ruleLocales[0].code])],
  ['storage broken (privacy mode) → browser miss', { storageBroken: true, languages: ['en'], language: 'en' }, decide(['en'])],
  ['empty language entries tolerated', { languages: ['', `${ruleLocales[0].code.split('-')[0]}-TW`], language: '' }, decide(['', `${ruleLocales[0].code.split('-')[0]}-TW`])],
].map(([name, opts, expectedCode]) => [name, opts, `/${expectedCode}/`]);

// 应用根用例：每个应用 4 条（记忆双向 + 浏览器双向）
const appCases = appIds.flatMap((appId) => [
  [`${appId}: memory ${fallbackCode} beats browser`, { memory: fallbackCode, languages: [ruleLocales[0].code], language: ruleLocales[0].code }, `/${fallbackCode}/${appId}/`],
  [`${appId}: memory ${ruleLocales[0].code}`, { memory: ruleLocales[0].code, languages: ['en'], language: 'en' }, `/${ruleLocales[0].code}/${appId}/`],
  [`${appId}: browser hit → /${ruleLocales[0].code}/${appId}/`, { languages: [ruleLocales[0].code], language: ruleLocales[0].code }, `/${ruleLocales[0].code}/${appId}/`],
  [`${appId}: browser miss → /${fallbackCode}/${appId}/`, { languages: ['en'], language: 'en' }, `/${fallbackCode}/${appId}/`],
]);

let pass = 0;
const siteScript = scripts[0].script;
for (const [name, opts, expected] of siteCases) {
  const got = runCase(siteScript, opts);
  if (got === expected) { pass++; } else { failures.push('site: ' + name); console.log(`FAIL  site: ${name} → got ${got}, want ${expected}`); }
}
for (const page of scripts.slice(1)) {
  for (const [name, opts, expected] of appCases) {
    const got = runCase(page.script, opts);
    if (got === expected) { pass++; } else { failures.push(`${page.file}: ${name}`); console.log(`FAIL  ${page.file}: ${name} → got ${got}, want ${expected}`); }
  }
}

// 落地为根绝对路径：目标与发起页地址形态无关（/flashnote/ 与 /flashnote/index.html 同落点）
const resolveChecks = jumpPages.map((page) => [
  `${page.file} target is root-absolute`,
  runCase(extractScript(page.file), { languages: [ruleLocales[0].code], language: ruleLocales[0].code }).startsWith('/'),
  true,
]);
for (const [name, got, expected] of resolveChecks) {
  if (got === expected) { pass++; } else { failures.push('resolve: ' + name); console.log(`FAIL  resolve: ${name} → ${got}`); }
}

check(
  `AC2: ${siteCases.length} 条站点根用例 + ${appCases.length}×${scripts.length - 1} 条应用根用例 + ${resolveChecks.length} 条落地形态用例全过`,
  pass === siteCases.length + appCases.length * (scripts.length - 1) + resolveChecks.length,
);

// AC3：探测只发生在跳转页，全部内容页不含任何 <script>
for (const file of contentPages) {
  const body = fs.readFileSync(path.join(DIST, file), 'utf8');
  check(`AC3: /${file} 不含 <script>`, !body.includes('<script'));
}

// AC4：禁 JS 兜底——每个跳转页呈现全部登记语言的手动入口，落点为对应语言下的本应用/主站首页
for (const page of jumpPages) {
  const body = fs.readFileSync(path.join(DIST, page.file), 'utf8');
  for (const entry of registry) {
    const want = `href="/${entry.code}${page.segment}/">${entry.nativeLabel}`;
    check(`AC4: /${page.file} 禁 JS 入口 ${want}`, body.includes(want));
  }
}

console.log();
if (failures.length) {
  console.log(`VERIFY-REDIRECT FAILED: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('VERIFY-REDIRECT PASSED: all checks green');
