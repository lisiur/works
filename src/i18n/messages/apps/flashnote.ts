/**
 * FlashNote 应用文案（ISSUE-129 T2）：原 6 个成对内容页里按语言不同的全部内容归于此处——
 * 应用清单按语言条目（name / tagline / shortName）、导航与页脚、首页（含按语言的
 * 商店链接 / 徽章图 / 截图资源）、隐私政策（含更新日期）、支持页。
 * 每种登记语言必须各有一份，键集全等——由 src/i18n/index.ts 的深度校验把关（AC11）。
 * 语言中性内容（图标路径、SVG、邮箱、版权行）留在页面模板内，不进文案。
 */
export interface AppBadgeCopy {
  href: string;
  img: string;
  alt: string;
  width: number;
  height: number;
}

export type AppPrivacyBlock =
  | { type: 'p'; text: string }
  | { type: 'list'; items: { strong: string; text: string }[] };

export interface FlashNoteCopy {
  /** 应用清单按语言条目：卡片名称与页脚链接 / 卡片一句话简介 / 导航页脚 logo 短名 */
  name: string;
  tagline: string;
  shortName: string;
  /** 内容页导航与页脚（FlashNoteLayout 的 5 处文案） */
  nav: { features: string; privacy: string; support: string };
  footer: { support: string; privacy: string };
  home: {
    title: string;
    heroH1: string;
    heroTagline: string;
    /** 商店徽章：链接与徽章图都按语言不同（区域商店 / 不同徽章素材） */
    badges: AppBadgeCopy[];
    featuresLabel: string;
    featuresTitle: string;
    /** 6 条功能卡；模板侧 SVG 数量与其长度断言一致 */
    features: { h3: string; p: string }[];
    /** 高亮区截图按语言不同 */
    highlightH2: string;
    highlightP: string;
    highlightImg: string;
    privacyNoteH2: string;
    privacyNoteP: string;
    privacyNoteHref: string;
    privacyNoteLabel: string;
  };
  privacy: {
    title: string;
    h1: string;
    /** 更新日期格式按语言 */
    date: string;
    /** 列表项 text 含分隔符（zh 全角冒号 / en 冒号空格），渲染为 <strong>x</strong>text */
    sections: { h2: string; blocks: AppPrivacyBlock[] }[];
  };
  support: { title: string; h1: string; subtitle: string; intro: string };
}

export const copy: Record<string, FlashNoteCopy> = {
  'zh-CN': {
    name: '闪记 FlashNote',
    tagline: '捕捉每一个灵感的 macOS 笔记应用',
    shortName: '闪记',
    nav: { features: '功能特点', privacy: '隐私政策', support: '支持' },
    footer: { support: '支持', privacy: '隐私政策' },
    home: {
      title: '闪记 FlashNote — 捕捉每一个灵感',
      heroH1: '闪记',
      heroTagline: '捕捉每一个灵感',
      badges: [
        {
          href: 'https://apps.apple.com/cn/app/flashnote/id6824461040?platform=mac',
          img: '/flashnote/images/badges/mac-app-store-cnsc.svg',
          alt: '从 Mac App Store 下载',
          width: 140,
          height: 40,
        },
        {
          href: 'https://apps.apple.com/cn/app/flashnote/id6824461040',
          img: '/flashnote/images/badges/app-store-cnsc.svg',
          alt: '从 App Store 下载',
          width: 109,
          height: 40,
        },
      ],
      featuresLabel: '功能特点',
      featuresTitle: '为你打造的笔记体验',
      features: [
        { h3: 'iCloud 实时同步', p: 'iCloud 自动同步所有设备，随时随地访问，修改即保存。' },
        { h3: 'Markdown 支持', p: '实时渲染，写作流畅，让你的文字排版得心应手。' },
        { h3: '隐私优先', p: '数据仅存于你的 iCloud，我们无法访问任何笔记内容。' },
        { h3: '双平台支持', p: 'macOS 和 iOS 体验一致，随时切换设备继续写作。' },
        { h3: '简约界面', p: '专注内容，无干扰，让写作成为一种享受。' },
        { h3: '离线可用', p: '无网也能写作，随时同步，不受网络限制。' },
      ],
      highlightH2: '简约，却不简单',
      highlightP:
        '闪记专注于让你专注于内容本身。没有复杂的设置，没有账户注册——只需登录你的 Apple ID，笔记即刻在所有设备间同步。',
      highlightImg: '/flashnote/screenshots/mac/01-panel-dark.jpg',
      privacyNoteH2: '你的隐私，我们守护',
      privacyNoteP: '笔记数据仅存储在你的 iCloud 私有数据库中，端到端加密，我们无法访问任何内容。',
      privacyNoteHref: '/zh-CN/flashnote/privacy.html',
      privacyNoteLabel: '查看隐私政策 →',
    },
    privacy: {
      title: '闪记 FlashNote — 隐私政策',
      h1: '隐私政策',
      date: '更新日期：2026 年 10 月 19 日',
      sections: [
        {
          h2: '信息收集与使用',
          blocks: [
            {
              type: 'p',
              text: '闪记（FlashNote）不会收集任何个人身份信息。我们仅通过 Apple ID 与 iCloud 账户关联来同步你的笔记数据，所有数据均存储在你的个人 iCloud 账户中，我们无法访问你的笔记内容。',
            },
          ],
        },
        {
          h2: '数据存储',
          blocks: [
            {
              type: 'p',
              text: '你的笔记数据通过 iCloud 私有数据库存储和同步。我们不维护任何独立的服务器端数据库，所有数据均受 Apple 的 iCloud 服务条款和隐私政策约束。',
            },
          ],
        },
        {
          h2: '第三方服务',
          blocks: [
            { type: 'p', text: '我们使用以下第三方服务：' },
            {
              type: 'list',
              items: [
                { strong: 'Apple iCloud', text: '：笔记数据同步与存储' },
                { strong: 'CloudKit', text: '：iCloud 后端数据库服务' },
              ],
            },
          ],
        },
        {
          h2: '数据安全',
          blocks: [
            {
              type: 'p',
              text: '所有通过 iCloud 传输的数据均采用端到端加密。我们遵循 Apple 平台的标准安全实践来保护你的数据不被未授权访问。',
            },
          ],
        },
        {
          h2: '政策变更',
          blocks: [
            {
              type: 'p',
              text: '我们会不时更新本隐私政策。任何重大变更将在应用内显著位置通知你。继续使用闪记即表示你同意更新后的政策。',
            },
          ],
        },
        {
          h2: '联系我们',
          blocks: [{ type: 'p', text: '如果你对本隐私政策有任何疑问，请通过以下方式联系我们：' }],
        },
      ],
    },
    support: {
      title: '闪记 FlashNote — 支持',
      h1: '闪记',
      subtitle: 'FlashNote · 支持',
      intro: '如在使用中遇到问题或有任何建议，欢迎联系我们：',
    },
  },
  'en-US': {
    name: 'FlashNote',
    tagline: 'Capture every idea — a note app for macOS & iOS',
    shortName: 'FlashNote',
    nav: { features: 'Features', privacy: 'Privacy Policy', support: 'Support' },
    footer: { support: 'Support', privacy: 'Privacy Policy' },
    home: {
      title: 'FlashNote — Capture Every Idea',
      heroH1: 'FlashNote',
      heroTagline: 'Capture Every Idea',
      badges: [
        {
          href: 'https://apps.apple.com/us/app/flashnote/id6824461040?platform=mac',
          img: '/flashnote/images/badges/mac-app-store-usuk.svg',
          alt: 'Download on the Mac App Store',
          width: 156,
          height: 40,
        },
        {
          href: 'https://apps.apple.com/us/app/flashnote/id6824461040',
          img: '/flashnote/images/badges/app-store-usuk.svg',
          alt: 'Download on the App Store',
          width: 120,
          height: 40,
        },
      ],
      featuresLabel: 'Features',
      featuresTitle: 'Note-Taking, Reimagined',
      features: [
        {
          h3: 'iCloud Sync',
          p: 'Automatic sync across all your devices via iCloud. Changes are saved instantly.',
        },
        {
          h3: 'Markdown Support',
          p: 'Real-time rendering for smooth, distraction-free writing with beautiful formatting.',
        },
        { h3: 'Privacy First', p: 'Your data stays in your iCloud. We have zero access to your notes.' },
        {
          h3: 'Mac & iOS',
          p: 'Consistent experience on macOS and iOS. Seamlessly switch devices while writing.',
        },
        { h3: 'Minimal Design', p: 'Distraction-free interface focused entirely on your content.' },
        {
          h3: 'Offline Ready',
          p: "Write without an internet connection. Syncs automatically when you're back online.",
        },
      ],
      highlightH2: 'Minimal, Yet Powerful',
      highlightP:
        'FlashNote is designed to keep you focused on what matters — your content. No complex setup, no account required. Just sign in with your Apple ID and your notes sync across all your devices instantly.',
      highlightImg: '/flashnote/screenshots/mac/en/01-panel-dark.jpg',
      privacyNoteH2: 'Your Privacy, Protected',
      privacyNoteP:
        'Your notes are stored in your private iCloud database with end-to-end encryption. We have no access to any of your content.',
      privacyNoteHref: '/en-US/flashnote/privacy.html',
      privacyNoteLabel: 'View Privacy Policy →',
    },
    privacy: {
      title: 'FlashNote — Privacy Policy',
      h1: 'Privacy Policy',
      date: 'Last updated: October 19, 2026',
      sections: [
        {
          h2: 'Information Collection and Use',
          blocks: [
            {
              type: 'p',
              text: 'FlashNote does not collect any personally identifiable information. We only use your Apple ID and iCloud account to sync your note data, which is stored in your personal iCloud account. We have no access to your note content.',
            },
          ],
        },
        {
          h2: 'Data Storage',
          blocks: [
            {
              type: 'p',
              text: "Your note data is stored and synced through iCloud private database. We do not maintain any separate server-side database. All data is governed by Apple's iCloud Terms of Service and Privacy Policy.",
            },
          ],
        },
        {
          h2: 'Third-Party Services',
          blocks: [
            { type: 'p', text: 'We use the following third-party services:' },
            {
              type: 'list',
              items: [
                { strong: 'Apple iCloud', text: ': Note data sync and storage' },
                { strong: 'CloudKit', text: ': iCloud backend database service' },
              ],
            },
          ],
        },
        {
          h2: 'Data Security',
          blocks: [
            {
              type: 'p',
              text: "All data transmitted through iCloud is end-to-end encrypted. We follow Apple's platform standard security practices to protect your data from unauthorized access.",
            },
          ],
        },
        {
          h2: 'Changes to This Policy',
          blocks: [
            {
              type: 'p',
              text: 'We may update this Privacy Policy from time to time. Any significant changes will be communicated prominently within the app. By continuing to use FlashNote, you agree to the updated policy.',
            },
          ],
        },
        {
          h2: 'Contact Us',
          blocks: [
            { type: 'p', text: 'If you have any questions about this Privacy Policy, please contact us at:' },
          ],
        },
      ],
    },
    support: {
      title: 'FlashNote — Support',
      h1: 'FlashNote',
      subtitle: 'Support',
      intro: 'If you encounter any issues or have suggestions, feel free to reach out:',
    },
  },
};
