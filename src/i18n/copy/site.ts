/**
 * 站点层文案（ISSUE-129 T2）：站点首页与「返回主站入口」按语言单独维护。
 * 每种登记语言必须各有一份，键集全等——由 src/i18n/index.ts 的深度校验把关（AC11）。
 */
export interface SiteCopy {
  home: {
    title: string;
    heroTagline: string;
    sectionLabel: string;
    sectionTitle: string;
    moreNote: string;
    copyright: string;
  };
  /** 应用内容页「返回主站入口」文案，如「全部应用 / All Apps」 */
  allApps: string;
}

export const siteCopy: Record<string, SiteCopy> = {
  'zh-CN': {
    home: {
      title: 'Hapaul Apps — Lisiur Day 的应用作品',
      heroTagline: 'Lisiur Day 打造的原创应用',
      sectionLabel: '作品',
      sectionTitle: '全部应用',
      moreNote: '更多应用，陆续上线。',
      copyright: '© 2026 Lisiur Day. All rights reserved.',
    },
    allApps: '全部应用',
  },
  'en-US': {
    home: {
      title: 'Hapaul Apps — Original Apps by Lisiur Day',
      heroTagline: 'Original apps by Lisiur Day',
      sectionLabel: 'Apps',
      sectionTitle: 'All Apps',
      moreNote: 'More apps coming soon.',
      copyright: '© 2026 Lisiur Day. All rights reserved.',
    },
    allApps: 'All Apps',
  },
};
