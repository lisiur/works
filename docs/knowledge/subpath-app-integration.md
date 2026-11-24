# 子路径应用集成纪律

本站由 Astro 构建，地址结构为 **locale 前置全局路径**：每个语言一棵子树（`/zh-CN/`、`/en-US/`），应用是语言子树下的一段（`/zh-CN/flashnote/`、`/en-US/flashnote/…`）；应用根 `/<app>/` 是语言探测跳转页，探测后落 `/{语言}/{app}/`。站点层（首页卡片、页脚链接、应用跳转页、返回主站入口）由应用清单数据（`src/data/apps.ts`）与共享布局自动生成。接入新应用、或把现成官网整站迁入语言子树时，适用以下稳定做法。
（ISSUE-124 起本篇按 Astro 构建体系改写：相对路径纪律解除、快照迁移校验失效删除、接入流程改数据登记；验收反馈后地址定版为 locale 前置。）

## 根绝对路径与地址形态纪律

- **场景**：页面迁为 Astro 路由后，判断站内链接写法是否正确、改动是否部署安全。
- **症状**（违反时）：链接落到错误路径（404 或落错语言 / 层级）；产物级自测 sweep 报断链。
- **做法**：站内链接一律**根绝对路径**；语言子树在前——index 页一律目录形态（`/zh-CN/`、`/zh-CN/flashnote/`），内容页保留 `.html` 形态（`/zh-CN/flashnote/privacy.html`）；带锚点的 index 目标写目录形态 + fragment（`/zh-CN/flashnote/#features`）；应用自有静态资源在应用段下（`/flashnote/images/…`），不随内容页进语言子树；外链（应用商店、mailto）原样写。「全相对路径」旧纪律已随 ISSUE-124 重构有意解除，改用产物级地址清单 + 断链 sweep 验收。
- **交付自检**：`pnpm verify` 的 sweep 对产物全部 href/src 做 resolve → 剥 `#fragment` → `/dir/index.html` 归一为 `/dir/` 后逐一请求，断链数 0。

## 语言跳转页与偏好记忆

- **场景**：站点根与应用根不直接呈现内容，按访问者语言落地语言子树；用户手动切换过语言后，期望回访不被探测弹回。
- **做法**：跳转页判定顺序 = localStorage 记忆 > 浏览器语言（`navigator.languages` 任一项 `zh` 开头 → `zh-CN`，否则 `en-US`）；脚本内联在 `<head>`（组件 `LangRedirectScript.astro`，`is:inline` 原样透传，两个跳转页共用同一段判定逻辑，落地段由 `HAPUAL_JUMP_PATH` 参数化：站点根落 `/<语言>/`，应用根落 `/<语言>/<app>/`），命中后 `location.replace`，禁 JS 时页面呈现两个手动入口链接兜底。语言记忆是**站点级一份**（同 origin 天然共用，站点根与应用根共享）：写入只发生在语言互切链接的 `onclick`（try/catch 静默失败），key `hapaul-lang`，合法值 `zh-CN` / `en-US`；读取只发生在跳转页。内容页之间互切不做探测——用户明确选择优先，无弹回循环。改版下线的旧地址不留任何兼容页，自然 404。

## 新应用接入流程

- **场景**：接入一个新应用的 Homepage。
- **做法**：照仓库根接入文档 `ADDING-AN-APP.md`——在 `src/data/apps.ts` 登记一条应用数据、放图标（`public/assets/icons/`）、写该应用自己的内容页（语言子树下 `src/pages/<语言>/<app>/`，复用共享 `AppLayout.astro`）。站点层全部自动生成：双语首页卡片、页脚链接、应用跳转页、返回主站入口（`AppLayout` 统一置入 nav + footer 首位），全程不改站点层文件；完成后同步更新 `scripts/verify-links.mjs` 期望清单，`pnpm verify` + `pnpm preview` 自检。
