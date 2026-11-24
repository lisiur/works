/**
 * 应用清单：站点层（首页卡片、页脚链接、应用跳转页）的唯一数据源。
 * 接入新应用只需在此登记一条 + 放图标 + 写该应用自己的页面（见 ADDING-AN-APP.md）。
 */
import type { Locale } from '../lib/i18n';

export interface AppLocaleInfo {
  /** 首页卡片名称与页脚链接文案，如「闪记 FlashNote」 */
  name: string;
  /** 首页卡片一句话简介 */
  tagline: string;
  /** 导航 / 页脚 logo 短名，如「闪记」 */
  shortName: string;
}

export interface AppEntry {
  /** 子路径：'flashnote' → /flashnote/ */
  id: string;
  /** 卡片图标根绝对路径 */
  icon: string;
  /** 应用跳转页 <title> / <h1> / 卡片 img alt */
  jumpTitle: string;
  /** 应用跳转页 description */
  jumpDescription: string;
  zh: AppLocaleInfo;
  en: AppLocaleInfo;
}

export function localeInfo(app: AppEntry, locale: Locale): AppLocaleInfo {
  return locale === 'zh-CN' ? app.zh : app.en;
}

export const apps: readonly AppEntry[] = [
  {
    id: 'flashnote',
    icon: '/assets/icons/flashnote.png',
    jumpTitle: 'FlashNote',
    jumpDescription: 'FlashNote — 捕捉每一个灵感 · Capture Every Idea.',
    zh: {
      name: '闪记 FlashNote',
      tagline: '捕捉每一个灵感的 macOS 笔记应用',
      shortName: '闪记',
    },
    en: {
      name: 'FlashNote',
      tagline: 'Capture every idea — a note app for macOS & iOS',
      shortName: 'FlashNote',
    },
  },
];

export function getApp(id: string): AppEntry | undefined {
  return apps.find((app) => app.id === id);
}
