/**
 * i18n 汇总出口（ISSUE-129 T2）：页面 / 布局 / 组件只从这里取语言登记与文案。
 * 模块加载即执行深度校验（AC11 构建期闸门）——静态构建的每个页面都会加载本模块，
 * 任何一处文案缺失 / 不齐 / 为空都让 `pnpm build` 失败并指明条目与语言。
 */
import { apps } from '../data/apps';
import { localeCodes } from './locales';
import { siteCopy, type SiteCopy } from './copy/site';
import * as flashnoteCopy from './copy/apps/flashnote';
export type { SiteCopy } from './copy/site';
export type { FlashNoteCopy } from './copy/apps/flashnote';

/**
 * 应用文案模块登记表：接入新应用在 copy/apps/ 下加一份模块并在此外登记一行。
 * 与 src/data/apps.ts 的应用 id 集必须一致（校验 ③）。
 */
const appCopyModules: Record<string, Record<string, unknown>> = {
  flashnote: flashnoteCopy.copy,
};

// ── 深度校验 ──

interface PathInfo {
  kind: 'string' | 'number' | 'boolean' | 'null' | 'array' | 'object';
  arrayLen?: number;
}

function kindOf(value: unknown): PathInfo['kind'] {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return typeof value as PathInfo['kind'];
}

function walk(value: unknown, prefix: string, into: Map<string, PathInfo>): void {
  const kind = kindOf(value);
  into.set(prefix, { kind, arrayLen: kind === 'array' ? (value as unknown[]).length : undefined });
  if (kind === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      walk(child, `${prefix}.${key}`, into);
    }
  } else if (kind === 'array') {
    (value as unknown[]).forEach((child, i) => walk(child, `${prefix}[${i}]`, into));
  }
}

const errors: string[] = [];
const codes = localeCodes();

function validateScope(scope: string, copyByLocale: Record<string, unknown>): void {
  // ① 键集 ≡ 登记语言集：缺语言 / 多语言都报错
  const present = Object.keys(copyByLocale);
  for (const code of codes) {
    if (!present.includes(code)) errors.push(`文案语言不齐：${scope} 缺少 ${code}`);
  }
  for (const code of present) {
    if (!codes.includes(code)) errors.push(`文案语言不齐：${scope} 多出未登记语言 ${code}`);
  }
  if (errors.length > 0) return; // 语言都不齐时无法继续深比较

  // ② 以全部语言的并集为基准逐路径核对：缺键、类型不一致、数组长度不齐、空串
  const trees = new Map<string, Map<string, PathInfo>>();
  for (const [code, tree] of Object.entries(copyByLocale)) {
    const map = new Map<string, PathInfo>();
    walk(tree, scope, map);
    trees.set(code, map);
  }
  const union = new Set<string>();
  for (const map of trees.values()) for (const p of map.keys()) union.add(p);

  for (const path of union) {
    const presentLocales = [...trees.entries()].filter(([, map]) => map.has(path));
    for (const [code, map] of trees) {
      if (!map.has(path)) {
        errors.push(`文案不完整：${path} (${code})`);
        continue;
      }
      const info = map.get(path)!;
      const firstKind = presentLocales[0][1].get(path)!.kind;
      if (info.kind !== firstKind) {
        errors.push(`文案类型不一致：${path} (${code} 是 ${info.kind})`);
      }
    }
    const lengths = new Map<string, number>();
    for (const [code, map] of trees) {
      const len = map.get(path)?.arrayLen;
      if (len !== undefined) lengths.set(code, len);
    }
    if (lengths.size > 1) {
      const base = [...lengths.entries()][0];
      for (const [code, len] of lengths) {
        if (len !== base[1]) {
          errors.push(`文案数组长度不齐：${path}（${base[0]}=${base[1]}, ${code}=${len}）`);
        }
      }
    }
    for (const [code, map] of trees) {
      const original = map.get(path);
      if (original?.kind === 'string') {
        // 从原树取值判空串（路径去掉作用域前缀后逐段下钻）
        const value = path
          .slice(scope.length + 1)
          .replace(/\[(\d+)\]/g, '.$1')
          .split('.')
          .filter((key) => key !== '')
          .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], copyByLocale[code]);
        if (value === '') errors.push(`文案为空串：${path} (${code})`);
      }
    }
  }

  if (scope === 'site') return;
  // 应用文案必填条目：卡片与导航页脚依赖的 name / tagline / shortName
  const appId = scope.replace(/^apps\./, '');
  for (const code of codes) {
    const copy = copyByLocale[code] as Record<string, unknown> | undefined;
    for (const field of ['name', 'tagline', 'shortName']) {
      if (typeof copy?.[field] !== 'string' || copy[field] === '') {
        errors.push(`应用文案缺少必填条目：${scope}.${field} (${code})`);
      }
    }
  }
}

validateScope('site', siteCopy as Record<string, unknown>);
for (const [appId, copyByLocale] of Object.entries(appCopyModules)) {
  validateScope(`apps.${appId}`, copyByLocale);
}

// ③ 应用清单 id 集 ≡ 应用文案模块集
for (const app of apps) {
  if (!(app.id in appCopyModules)) errors.push(`应用 ${app.id} 缺少文案模块 src/i18n/copy/apps/${app.id}.ts`);
}
for (const appId of Object.keys(appCopyModules)) {
  if (!apps.some((app) => app.id === appId)) errors.push(`应用文案模块 src/i18n/copy/apps/${appId}.ts 未在应用清单登记`);
}

if (errors.length > 0) {
  throw new Error('[i18n] 文案不完整：\n' + errors.map((m) => `  - ${m}`).join('\n'));
}

// ── 出口 ──

export { localeEntries, localeCodes, otherLocales, localeEntryOf, fallbackLocale, abs, SITE_URL, esc } from './locales';
export type { LocaleEntry, AlternateLink } from './locales';

/** 站点层文案；未登记 code 直接抛错 */
export function siteCopyOf(code: string): SiteCopy {
  const copy = (siteCopy as Record<string, SiteCopy | undefined>)[code];
  if (!copy) throw new Error(`[i18n] 未登记的语言：${code}`);
  return copy;
}

/** 应用文案（按语言）；应用 id 未登记直接抛错 */
export function appCopyOf(appId: string): Record<string, Record<string, unknown>> {
  const copy = appCopyModules[appId];
  if (!copy) throw new Error(`[i18n] 未登记的应用文案：${appId}`);
  return copy;
}

/** 应用清单（语言中性字段） */
export { apps, getApp, type AppEntry } from '../data/apps';
