/**
 * AC7 截图比对探针（ISSUE-129）：pixelmatch 逐对比较两目录同名截图。
 * 用法：node QA/GUIProbes/compare.mjs <基准目录> <当前目录> [diff 输出目录]
 * DM 判定口径：threshold 0.1，目标 0 差异像素；若字体抗锯齿抖动，
 * 降级为差异像素 ≤0.01% 且无 >4×4 连片（实际判定值评审留痕）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR_A = path.resolve(process.argv[2]);
const DIR_B = path.resolve(process.argv[3]);
const DIFF_DIR = process.argv[4] ? path.resolve(process.argv[4]) : null;
const THRESHOLD = 0.1;

const names = fs.readdirSync(DIR_A).filter((f) => f.endsWith('.png')).sort();
const missing = names.filter((f) => !fs.existsSync(path.join(DIR_B, f)));
if (missing.length) {
  console.log(`COMPARE FAILED: 当前目录缺 ${missing.length} 张：${missing.join(', ')}`);
  process.exit(1);
}

let failures = 0;
for (const name of names) {
  const a = PNG.sync.read(fs.readFileSync(path.join(DIR_A, name)));
  const b = PNG.sync.read(fs.readFileSync(path.join(DIR_B, name)));
  if (a.width !== b.width || a.height !== b.height) {
    console.log(`FAIL  ${name}: 尺寸不同 ${a.width}x${a.height} vs ${b.width}x${b.height}`);
    failures++;
    continue;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: THRESHOLD });
  if (n === 0) {
    console.log(`  ok  ${name}: 0 差异像素`);
  } else {
    const ratio = ((n / (a.width * a.height)) * 100).toFixed(4);
    console.log(`FAIL  ${name}: ${n} 差异像素（${ratio}%）`);
    failures++;
    if (DIFF_DIR) {
      fs.mkdirSync(DIFF_DIR, { recursive: true });
      fs.writeFileSync(path.join(DIFF_DIR, name), PNG.sync.write(diff));
    }
  }
}

console.log();
if (failures) {
  console.log(`COMPARE FAILED: ${failures}/${names.length} 对存在差异`);
  process.exit(1);
}
console.log(`COMPARE PASSED: ${names.length} 对截图 0 差异（threshold ${THRESHOLD}）`);
