/**
 * 双语站点共用常量与 helper（ISSUE-124 T2）。
 * 两语言目录完全对称：zh-CN / en-US；不使用 Astro 内置 i18n 路由（DM 方案 D5）。
 */

export type Locale = 'zh-CN' | 'en-US';

export const LOCALES: readonly Locale[] = ['zh-CN', 'en-US'];

/** `<html lang>` 取值，与基线逐页一致 */
export const htmlLang: Record<Locale, string> = {
  'zh-CN': 'zh-Hans',
  'en-US': 'en',
};

export const SITE_URL = 'https://apps.hapaul.top';

export function otherLocale(locale: Locale): Locale {
  return locale === 'zh-CN' ? 'en-US' : 'zh-CN';
}

/** 根绝对路径 → 站点绝对 URL（canonical / hreflang 用） */
export function abs(path: string): string {
  return SITE_URL + path;
}

export interface AlternateLink {
  hreflang: string;
  href: string;
}
