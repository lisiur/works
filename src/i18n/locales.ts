/**
 * 语言登记薄封装（ISSUE-129 T1）：`locales.json` 是语言列表的唯一来源，
 * 本文件只做三件事——给出类型、构建期校验（code 唯一、fallback 恰好一个、match 可编译）、
 * 把 match 声明编译为 RegExp。页面 / 布局 / 组件 / verify 脚本一律从这里（或直接读 JSON）取语言，
 * 不再写死两种语言（原 `src/lib/i18n.ts` 的 SITE_URL / abs / AlternateLink 并入本文件）。
 */
import registryJson from './locales.json';

export const SITE_URL = 'https://apps.hapaul.top';

/** 根绝对路径 → 站点绝对 URL（canonical / hreflang 用） */
export function abs(path: string): string {
  return SITE_URL + path;
}

export interface AlternateLink {
  hreflang: string;
  href: string;
}

/** locales.json 里一条语言登记的形状 */
export interface LocaleEntryJson {
  /** 地址段，也是 hapaul-lang 的存值，如 'zh-CN' */
  code: string;
  /** `<html lang>` 取值，如 'zh-Hans' */
  htmlLang: string;
  /** hreflang 值，如 'zh-Hans' / 'en-US'（与地址段不是同一套写法） */
  hreflang: string;
  /** 语言自称，跳转页手动入口与语言胶囊标签，如 '中文' / 'English' */
  nativeLabel: string;
  /** 浏览器语言匹配规则；不声明则只能被记忆或回退命中 */
  match?: { source: string; flags?: string };
  /** 回退语言；全部登记中恰好一个为 true */
  fallback?: boolean;
}

/** 编译后的语言条目：match 已转 RegExp */
export interface LocaleEntry extends LocaleEntryJson {
  rule?: RegExp;
}

const registry = registryJson as LocaleEntryJson[];

// ── 构建期校验：登记本身不合法直接让构建失败 ──
const registryErrors: string[] = [];
const seenCodes = new Set<string>();
for (const entry of registry) {
  if (!entry.code) registryErrors.push(`语言登记缺 code`);
  else if (seenCodes.has(entry.code)) registryErrors.push(`语言 code 重复：${entry.code}`);
  else seenCodes.add(entry.code);
  if (entry.match) {
    try {
      new RegExp(entry.match.source, entry.match.flags ?? '');
    } catch (e) {
      registryErrors.push(`语言 ${entry.code} 的 match 无法编译：${String(e)}`);
    }
  }
}
const fallbackCount = registry.filter((entry) => entry.fallback).length;
if (fallbackCount !== 1) registryErrors.push(`回退语言必须恰好一个，实际 ${fallbackCount} 个`);
if (registryErrors.length > 0) {
  throw new Error('[i18n] 语言登记非法：\n' + registryErrors.map((m) => `  - ${m}`).join('\n'));
}

export const localeEntries: LocaleEntry[] = registry.map((entry) => ({
  ...entry,
  rule: entry.match ? new RegExp(entry.match.source, entry.match.flags ?? '') : undefined,
}));

/** 登记语言 code 列表（登记序） */
export function localeCodes(): string[] {
  return localeEntries.map((entry) => entry.code);
}

/** 当前语言之外的全部登记语言（登记序；语言胶囊 / 手动入口按此生成，D3） */
export function otherLocales(code: string): LocaleEntry[] {
  return localeEntries.filter((entry) => entry.code !== code);
}

/** 回退语言条目 */
export function fallbackLocale(): LocaleEntry {
  return localeEntries.find((entry) => entry.fallback)!;
}

/** 未登记的 code 直接抛错（调用侧只应传登记语言） */
export function localeEntryOf(code: string): LocaleEntry {
  const entry = localeEntries.find((e) => e.code === code);
  if (!entry) throw new Error(`[i18n] 未登记的语言：${code}`);
  return entry;
}

/**
 * 按字面文本转义（仅 & < >，撇号保持原样）——与 Astro 字面模板文本的转义口径一致。
 * 文案字符串经 `{expr}` 插值时 Astro 会把撇号转成 &#39;（与基线字面文本不同），
 * 需要逐字节等价的正文区用 `set:html={esc(文案)}` 渲染。
 */
export function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
