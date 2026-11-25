/**
 * AC10 L0 静态探针（ISSUE-129）：「页面单份 + 文案字典 + 语言登记」的纪律由脚本断言，
 * 评审时运行并留输出。三条断言：
 *   P1  src/pages、src/layouts、src/components 无 `locale ===` 式二元分支、无 otherLocale 残留；
 *   P2  语言字面量 'zh-CN' / 'en-US' 只允许出现在 src/i18n/ 与 scripts/（QA/ 探针自身除外）；
 *   P3  src/data/apps.ts 无按语言固定字段（zh: / en:），不再 import Locale。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const failures = [];
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok  ${name}`);
  else { failures.push(name); console.log(`FAIL  ${name} ${detail}`); }
}

function walk(dir, exts, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, out);
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

// ── P1：无二元语言分支 ──
const P1_DIRS = ['src/pages', 'src/layouts', 'src/components'].map((d) => path.join(ROOT, d));
const P1_PATTERNS = [
  { re: /\blocale\s*===/, label: 'locale ===' },
  { re: /===\s*\blocale\b/, label: '=== locale' },
  { re: /\blocale\s*!==/, label: 'locale !==' },
  { re: /!==\s*\blocale\b/, label: '!== locale' },
  { re: /\botherLocale\b/, label: 'otherLocale 残留' },
  { re: /\bconst\s+zh\s*=/, label: 'const zh =（二元标记变量）' },
];
const p1Hits = [];
for (const dir of P1_DIRS) {
  for (const file of walk(dir, ['.astro', '.ts', '.tsx'])) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const { re, label } of P1_PATTERNS) {
        if (re.test(line)) p1Hits.push(`${path.relative(ROOT, file)}:${i + 1} ${label} → ${line.trim()}`);
      }
    });
  }
}
check('P1: pages/layouts/components 无 locale 二元分支与 otherLocale 残留', p1Hits.length === 0, p1Hits.join(' | '));

// ── P2：语言字面量只允许在 src/i18n/ 与 scripts/ ──
const P2_ROOTS = ['src'].map((d) => path.join(ROOT, d));
const ALLOWED = ['src/i18n'];
const LITERAL = /(['"])zh-CN\1|(['"])en-US\2/;
const p2Hits = [];
for (const root of P2_ROOTS) {
  for (const file of walk(root, ['.astro', '.ts', '.tsx', '.mjs', '.js', '.json'])) {
    const rel = path.relative(ROOT, file);
    if (ALLOWED.some((dir) => rel.startsWith(dir))) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (LITERAL.test(line)) p2Hits.push(`${rel}:${i + 1} → ${line.trim()}`);
    });
  }
}
check("P2: 语言字面量 'zh-CN'/'en-US' 只出现在 src/i18n/", p2Hits.length === 0, p2Hits.join(' | '));

// ── P3：应用清单语言中性化 ──
const appsSrc = fs.readFileSync(path.join(ROOT, 'src', 'data', 'apps.ts'), 'utf8');
const p3Hits = [];
if (/\bzh\s*:/.test(appsSrc)) p3Hits.push('存在 zh: 固定字段');
if (/\ben\s*:/.test(appsSrc)) p3Hits.push('存在 en: 固定字段');
if (/\bLocale\b/.test(appsSrc)) p3Hits.push('仍引用 Locale');
if (/localeInfo/.test(appsSrc)) p3Hits.push('仍存在 localeInfo');
check('P3: src/data/apps.ts 无按语言固定字段、无 Locale 依赖', p3Hits.length === 0, p3Hits.join(' | '));

console.log();
if (failures.length) {
  console.log(`AC10 PROBE FAILED: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('AC10 PROBE PASSED: P1/P2/P3 all green');
