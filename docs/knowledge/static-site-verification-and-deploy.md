# 静态站自测与部署顺序

本站由 Astro 构建输出到 `dist/`，GitHub Actions（`withastro/action`）在 push `main` 后自动构建发布；站点唯一的客户端脚本是各跳转页里的一段内联语言探测脚本（由 `LangRedirectScript.astro` 从语言登记生成：读 localStorage 记忆 + 按登记规则匹配浏览器语言后 `location.replace`，落地 `/{语言}/` 或 `/{语言}/{app}/`），无其他客户端 JS。
（ISSUE-124 起本篇按构建体系改写；验收反馈后地址定版为 locale 前置 `/{语言}/{app}/…`。ISSUE-129 起自测脚本期望清单由语言登记与页面模板推导，不再手写。）

## 产物级全量自测

- **场景**：任何页面 / 样式 / 数据 / 文案改动后的本地验收。**验收对象是构建产物，不是 dev 源码。**
- **症状**（脚本不当时）：大量带锚点的链接（`xxx#anchor`）被误报 404——URL 的 `#fragment` 不随 HTTP 请求发送。
- **做法**：
  1. `pnpm verify` = `astro build` + `scripts/verify-links.mjs` + `scripts/verify-redirect.mjs`。两个脚本的期望清单（HTML 集合、地址清单、sweep 页面集、跳转用例矩阵、禁 JS 入口断言）由 `src/i18n/locales.json` + 应用文案模块文件名（`src/i18n/copy/apps/`）+ 页面模板（`src/pages/[locale]/<app>/`）**自动推导**，接语言 / 接应用无需改脚本；唯一手写项是历史下线地址 `gone`：
     - verify-links：对 `dist/` 起零依赖静态服务（尾斜杠 → 目录 index，不存在 → 404），断言产物 HTML 集合与推导页面清单一一对应、全部页面地址（含 index 页 `.html` 直写形态）200、已下线旧地址（ISSUE-119 集合 `/en/`、`/flashnote/en/` 等；重构前旧样式路径 `/styles.css`、`/flashnote/styles.css`；locale 前置改版前的 `/{app}/{locale}/…` 页面地址）全部 404；随后爬全部页面 href/src，剥 `#fragment` 后逐一请求，断链数应为 0；
     - verify-redirect：从产物抽各跳转页（站点根 + 每个应用根）的内联脚本，断言判定逻辑逐字节一致、各自落地段（`HAPUAL_JUMP_PATH`）正确；mock `navigator.languages` / `navigator.language` / `localStorage` / `location.replace` 跑跳转用例矩阵（用例期望值由登记语义模拟推导——候选序 × 登记序规则匹配、记忆优先、回退兜底；站点根落 `/{语言}/`，应用根落 `/{语言}/{app}/`）；断言全部内容页不含任何 `<script>`；断言跳转页禁 JS 呈现全部登记语言的手动入口。
     - 用例条数随登记推导变化（当前双语言登记下为 17 条站点根 + 4 条应用根 + 2 条落地形态 = 23 条），口径以脚本运行输出为准，文档不再固定条数。
  2. `pnpm preview`（http://localhost:4321）人工逐页过一遍（对照线上 https://apps.hapaul.top 现状）。
  3. 视觉回归（可选，UI 改动时）：`QA/GUIProbes/capture.mjs`（headless Chrome 对全部页面在 1440 / 390 两档宽度截图）+ `QA/GUIProbes/compare.mjs`（pixelmatch 逐对比对，threshold 0.1，目标 0 差异像素）。站点样式不含 `prefers-color-scheme` 查询，明暗由页面自身设计决定，无配色矩阵。

## GitHub Pages 冷启动与 Actions 切换顺序

- **场景**：站点仓库从零上线，或 Pages 发布方式从 "Deploy from a branch" 切到 GitHub Actions。
- **做法**（固定顺序）：交付分支通过验收 → Lead 合并出 `main` 并推送（工作流入库）→ 仓库 Settings → Pages → Source 切 **GitHub Actions**（legacy `pages-build-deployment` 随之停用，已上线部署继续服务，无空档）→ 手动 `workflow_dispatch` 触发首跑（合并那次 push 发生在切换前，不会留下成功记录）→ Actions 全绿后线上补验：全部页面地址 200（遇 5xx 重试再判定）、`apps.hapaul.top` 与 HTTPS 正常、旧地址 404。
- Actions 路径不走 Jekyll，`dist/_astro/` 下划线资源安全；`CNAME` 随 `public/` 进入产物根（域名同时在 Pages 设置里，双保险）。仓库的默认分支在 GitHub 上不可删除，删除旧交付分支前须先把默认分支切到 `main`。

## 语言跳转页自测口径

- **场景**：改动跳转页脚本、语言登记（`src/i18n/locales.json`）或语言互切链接后的本地验收。
- **做法**：四类行为由 `pnpm verify` 的 verify-redirect 自动覆盖——① 站点根 / 应用根按浏览器语言落地（逐候选按登记规则匹配，如 `zh` 开头 → `/zh-CN/…`、`ja` 开头 → `/ja-JP/…`，全不命中落回退语言；应用根多落应用段 `/{语言}/{app}/`），且各跳转页判定逻辑逐字节一致；② 语言互切写入 `hapaul-lang`（站点级一份）后，跳转页优先落记忆语言；③ 内容页之间互切不发生探测（内容页无 `<script>`，互切只写偏好不跳页）；④ 禁 JS 时跳转页呈现全部登记语言的手动入口且均可达。人工复核用 `pnpm preview`。

## 首页卡片登记口径

- **场景**：首页新增或修改应用卡片。
- **做法**：卡片不再手写——在 `src/data/apps.ts` 登记一条 `AppEntry`（图标、应用段 id、语言中性的跳转页元信息），并在 `src/i18n/copy/apps/<appId>.ts` 登记各语言的名称 / 简介 / 短名；各语言首页的卡片与页脚链接、应用跳转页由数据自动生成；接入步骤见 `ADDING-AN-APP.md`。