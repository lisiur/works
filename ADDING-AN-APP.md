# 新增应用 Homepage 接入约定

本站点（apps.hapaul.top）由 Astro 构建、GitHub Actions 自动发布。地址结构为 **locale 前置全局路径**：所有内容页都在 `/{语言}/` 子树下，应用是其下一段（如 `/zh-CN/flashnote/`、`/en-US/flashnote/privacy.html`）；应用根 `/<app>/` 是语言探测跳转页，落 `/{语言}/{app}/`。

站点遵循「**页面单份 + 文案字典 + 语言登记**」（ISSUE-129）：页面结构只写一份，文案按语言单独维护；语言列表只在 `src/i18n/locales.json` 一处声明。接入一个新应用 = 「登记一条应用数据 + 登记该应用文案 + 放图标 + 写一份页面模板」；站点层（各语言首页卡片、页脚链接、应用跳转页、返回主站入口、语言胶囊）由共享布局与数据自动生成，**全程不需要改动任何站点层文件**。

## 0. 工程命令

```bash
pnpm install        # 安装依赖（锁文件入库）
pnpm dev            # 本地开发（源码模式，仅供写页面时预览）
pnpm build          # 构建产物到 dist/（验收对象是产物）
pnpm verify         # 构建 + 产物级自测（断链 sweep、地址清单、语言跳转用例）全绿
pnpm preview        # 对构建产物起本地服务（http://localhost:4321）
```

`pnpm verify` 的期望清单（HTML 集合、地址清单、跳转用例矩阵、禁 JS 入口断言）由语言登记与应用页面模板**自动推导**——接应用、接语言都不需要同步改自测脚本。

## 1. 登记应用数据（唯一登记点）

**① 应用清单**：编辑 `src/data/apps.ts`，在 `apps` 数组追加一条（只登记**语言中性**字段）：

```ts
{
  id: 'newapp',                                   // 子路径段：跳转页 /newapp/，内容页 /<语言>/newapp/…
  icon: '/assets/icons/newapp.png',               // 卡片图标，根绝对路径
  jumpTitle: 'NewApp',                            // 跳转页 <title>/<h1>/卡片 img alt（语言中性）
  jumpDescription: 'NewApp — 一句话 · One line.', // 跳转页 description（语言中性）
}
```

**② 应用文案**：新建 `src/i18n/copy/apps/newapp.ts`，为**每种登记语言**各写一份 `copy`（参照 `copy/apps/flashnote.ts`）：应用清单按语言条目（`name` / `tagline` / `shortName`）、导航与页脚、首页文案（含按语言的商店链接、徽章图、截图路径）、隐私政策（含更新日期）、支持页文案。

| 内容 | 用在哪 |
|---|---|
| `id`（清单） | 应用段：`/newapp/` 跳转页自动生成（探测后落 `/<语言>/newapp/`）；内容页地址为 `/<语言>/newapp/…` |
| `icon` / `jumpTitle` / `jumpDescription`（清单） | 卡片图标与 alt、应用跳转页元信息（各语言共用，语言中性） |
| `copy[<locale>].name` / `.tagline` / `.shortName` | 对应语言首页卡片名称与页脚链接 / 卡片一句话简介 / 应用内容页导航与页脚 logo 短名 |
| `copy[<locale>].nav` / `.footer` | 应用内容页导航项与页脚项文案 |
| `copy[<locale>].home` / `.privacy` / `.support` | 对应语言内容页正文 |

文案完整性由构建闸门保证：任一语言缺键、多键、空串、数组长度不齐，`pnpm build` 失败并指明条目与语言；应用清单 id 集 ≡ `copy/apps/` 模块集，缺一边构建即报错。

登记后构建：各语言首页自动出现对应语言的卡片与页脚链接，`/newapp/` 自动出现跳转页（同一段探测脚本 + 禁 JS 手动入口）——不改首页、跳转页、导航页脚组件中的任何一个。

## 2. 图标位置

首页卡片图标统一放在 `public/assets/icons/<app>.png`（建议 1024×1024 PNG）。`public/` 下的文件按原路径原样进入产物：`public/CNAME`、`public/assets/**`、`public/<app>/images|screenshots/**`——**应用自有静态资源在 `/<app>/` 下，不随内容页进语言子树**；按语言不同的素材（如区域商店徽章图、语言版截图）路径写在应用文案数据里，文件仍放 `/<app>/` 下。

## 3. 应用页面内容

- **跳转页不用写**：`/newapp/` 由应用清单数据自动生成（探测后落 `/{语言}/newapp/`）。
- **内容页只写一份模板**：放 `src/pages/[locale]/<app>/` 下（如 `index.astro`、`privacy.astro`），`getStaticPaths` 按语言登记生成全部语言的页面，产物地址即 `/{语言}/<app>/…`。frontmatter 只做「params → 文案」取数，不出现语言字面量与二元分支。复用共享布局——参照 FlashNote 的做法：应用自有 `xxxLayout.astro` 包一层共享的 `src/layouts/AppLayout.astro`，传入本应用的导航项、页脚项与版权行；页面只写自己的 head 元信息与正文区，正文文案取自应用文案数据。
- **返回主站入口不用写**：内容页 `nav-links` 与 `footer-links` 首位的「全部应用 / All Apps」由 `AppLayout.astro` 统一置入（落主站对应语言首页并写入 `hapaul-lang`，try/catch 静默失败），文案取自站点层文案（`src/i18n/copy/site.ts`），页面不需要也不能手写。
- **语言互切不用写**：`lang-pill` 由布局按语言登记生成——其余每种语言一颗胶囊（标签为该语言自称），index 页落目录形态（`/{目标语言}/<app>/`）、其余页落 `.html` 形态（`/{目标语言}/<app>/<page>.html`）。
- **链接写法**：站内链接一律根绝对路径；index 页目录形态（`/zh-CN/`、`/zh-CN/newapp/`），内容页 `.html` 形态（`/zh-CN/newapp/privacy.html`）；带锚点的 index 目标写目录形态 + fragment（`/zh-CN/newapp/#features`）。应用自有图片/截图仍写 `/<app>/images|screenshots/…`（按语言的路径由文案数据提供）。外链（应用商店、mailto）原样写。

## 4. 本地自检

```bash
pnpm verify     # 断链 0、地址清单、跳转用例全绿（期望清单自动推导，无需改脚本）
pnpm preview    # http://localhost:4321 逐页人工过一遍
```

- `http://localhost:4321/newapp/` 自动按浏览器语言（或 `hapaul-lang` 记忆）落 `/<语言>/newapp/`；禁 JS 呈现全部登记语言的手动入口；
- 各语言首页（`/zh-CN/`、`/en-US/`、……）卡片可见、入口可达；
- 内容页样式 / 图片全部加载、页内互链无断链（`pnpm verify` 已覆盖）；
- 确认无误后 commit + push 到任务分支；合并 `main` 由 Lead 在收尾阶段执行，GitHub Actions 随 push 自动构建发布。

## 5. 加一种语言

语言列表唯一来源是 `src/i18n/locales.json`，加一种语言**只加数据、不改任何页面 / 布局 / 组件 / 自测脚本**：

1. **登记语言**：在 `locales.json` 追加一条——`code`（地址段，也是 `hapaul-lang` 存值）、`htmlLang`（`<html lang>`）、`hreflang`、`nativeLabel`（语言自称，跳转页手动入口与胶囊标签用）、`match`（浏览器语言匹配规则，如 `{ "source": "^ja", "flags": "i" }`；不声明则只能被记忆或回退命中）。全部登记中 `fallback: true` 的回退语言必须恰好一个。
2. **补站点层文案**：在 `src/i18n/copy/site.ts` 为新语言补一份 `SiteCopy`。
3. **补应用文案**：在每个 `src/i18n/copy/apps/<app>.ts` 为新语言补一份应用文案；按语言的资源（商店链接、徽章图、截图）可直接复用现有语言的素材文件，不要求新增图片。

构建闸门会一路把关：语言登记后、文案补齐前，`pnpm build` 失败并逐条指明缺哪份文案（`文案语言不齐：site 缺少 <语言>`）；全部补齐后构建通过——新语言的首页、跳转页手动入口、语言胶囊、页面产物与自测用例全部自动出现。验证流程：`pnpm build` 核对产物多出 `/<语言>/` 下全部页面，`pnpm verify` 全绿（用例随登记自动扩展），`pnpm preview` 人工过一遍。三种及以上语言时语言胶囊的视觉样式另行设计（两种语言下与现状一致）。