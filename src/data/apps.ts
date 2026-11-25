/**
 * 应用清单：站点层（首页卡片、页脚链接、应用跳转页）的唯一登记点。
 * 本文件只登记**语言中性**字段；按语言的名称、简介、短名与全部应用文案
 * 在 `src/i18n/messages/apps/<appId>.ts`（ISSUE-129 起文案与清单分离）。
 * 接入新应用 = 在此登记一条 + 在 messages/apps/ 登记文案 + 放图标 + 写该应用自己的页面模板
 * （见 ADDING-AN-APP.md）。
 */
export interface AppEntry {
  /** 子路径：'flashnote' → /flashnote/ */
  id: string;
  /** 卡片图标根绝对路径 */
  icon: string;
  /** 应用跳转页 <title> / <h1> / 卡片 img alt */
  jumpTitle: string;
  /** 应用跳转页 description */
  jumpDescription: string;
}

export const apps: readonly AppEntry[] = [
  {
    id: 'flashnote',
    icon: '/assets/icons/flashnote.png',
    jumpTitle: 'FlashNote',
    jumpDescription: 'FlashNote — 捕捉每一个灵感 · Capture Every Idea.',
  },
];

export function getApp(id: string): AppEntry | undefined {
  return apps.find((app) => app.id === id);
}
