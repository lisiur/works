# 静态站自测与部署顺序

本站由 Astro 构建输出到 `dist/`，GitHub Actions（`withastro/action`）在 push `main` 后自动构建发布；站点唯一的客户端脚本是两个跳转页里的一段内联语言探测脚本（读 localStorage 记忆 + 浏览器语言后 `location.replace`，落地 `/{语言}/` 或 `/{语言}/{app}/`），无其他客户端 JS。
（ISSUE-124 起本篇按构建体系改写：自测对象改为构建产物、Pages 冷启动补 Actions 切换顺序、卡片登记改数据登记；验收反馈后地址定版为 locale 前置 `/{语言}/{app}/…`。）

## 产物级全量自测

- **场景**：任何页面 / 样式 / 数据改动后的本地验收。**验收对象是构建产物，不是 dev 源码。**
- **症状**（脚本不当时）：大量带锚点的链接（`xxx#anchor`）被误报 404——URL 的 `#fragment` 不随 HTTP 请求发送。
- **做法**：
  1. `pnpm verify` = `astro build` + `scripts/verify-links.mjs` + `scripts/verify-redirect.mjs`：
     - verify-links：对 `dist/` 起零依赖静态服务（尾斜杠 → 目录 index，不存在 → 404），爬全部页面 href/src，剥 `#fragment` 后逐一请求，断链数应为 0；同时断言地址清单——恰好 10 个 HTML、12 种地址 200、已下线旧地址（ISSUE-119 集合 `/en/`、`/flashnote/en/` 等；重构前旧样式路径 `/styles.css`、`/flashnote/styles.css`；locale 前置改版前的 `/{app}/{locale}/…` 页面地址）全部 404。站点页面清单变化时同步更新脚本顶部的期望清单；
     - verify-redirect：从产物抽两个跳转页的内联脚本，断言判定逻辑逐字节一致、各自落地段（`HAPUAL_JUMP_PATH`）正确；mock `navigator.languages` / `navigator.language` / `localStorage` / `location.replace` 跑 23 条跳转用例（站点根落 `/{语言}/`，应用根落 `/{语言}/{app}/`）；断言 8 个内容页不含任何 `<script>`。
  2. `pnpm preview`（http://localhost:4321）人工逐页过一遍（对照线上 https://apps.hapaul.top 现状）。

## GitHub Pages 冷启动与 Actions 切换顺序

- **场景**：站点仓库从零上线，或 Pages 发布方式从 "Deploy from a branch" 切到 GitHub Actions。
- **做法**（固定顺序）：交付分支通过验收 → Lead 合并出 `main` 并推送（工作流入库）→ 仓库 Settings → Pages → Source 切 **GitHub Actions**（legacy `pages-build-deployment` 随之停用，已上线部署继续服务，无空档）→ 手动 `workflow_dispatch` 触发首跑（合并那次 push 发生在切换前，不会留下成功记录）→ Actions 全绿后线上补验：12 种地址 200（遇 5xx 重试再判定）、`apps.hapaul.top` 与 HTTPS 正常、旧地址 404。
- Actions 路径不走 Jekyll，`dist/_astro/` 下划线资源安全；`CNAME` 随 `public/` 进入产物根（域名同时在 Pages 设置里，双保险）。仓库的默认分支在 GitHub 上不可删除，删除旧交付分支前须先把默认分支切到 `main`。

## 语言跳转页自测口径

- **场景**：改动跳转页脚本、语言目录（`zh-CN/` / `en-US/`）或语言互切链接后的本地验收。
- **做法**：四类行为由 `pnpm verify` 的 verify-redirect 自动覆盖——① 站点根 / 应用根按浏览器语言落地（`zh` 开头 → `/zh-CN/…`，其余 → `/en-US/…`；应用根多落应用段 `/{语言}/{app}/`），且两页判定逻辑同一段；② 语言互切写入 `hapaul-lang`（站点级一份）后，跳转页优先落记忆语言；③ 内容页之间互切不发生探测（内容页无 `<script>`，互切只写偏好不跳页）；④ 禁 JS 时跳转页呈现中文 / English 两个手动入口且均可达。人工复核用 `pnpm preview`。

## 首页卡片登记口径

- **场景**：首页新增或修改应用卡片。
- **做法**：卡片不再手写——在 `src/data/apps.ts` 登记一条 `AppEntry`（图标、双语名称 / 简介 / 短名、应用段 id、跳转页元信息），两张语言首页的卡片与页脚链接、应用跳转页由数据自动生成；接入步骤见 `ADDING-AN-APP.md`。
