# 新增应用 Homepage 接入约定

本站点（apps.hapaul.top）是纯静态 GitHub Pages 站点，发布根 = 仓库根，**无构建步骤**。新增一个应用 Homepage = 「建子目录 + 放图标 + 登记两张卡片」，照本文四步做即可，不需要改任何构建配置。

## 1. 目录契约

- 每个应用一个子目录，名为**小写应用名**：`flashnote/`、`gitpeek/`、`pinecone/`…
- 应用目录内是「跳转页 + 双语对称」结构，与站点根完全对称：应用根 `index.html` 是**语言探测跳转页**（站点根同款内联脚本），内容页分居 `zh-CN/` 与 `en-US/`。
- 应用官网的全部资源（样式、图片、截图）**只放在自己的子目录内**，与站点其他部分互不引用。
- 站内互链一律使用**相对路径**（同层直接写、跨层用 `../`），不要写根绝对路径（`/xxx`）和绝对域名，保证任意子路径下都能打开。
- 站点层入口：根 `index.html`（语言探测跳转页）、`zh-CN/index.html`（中文首页）、`en-US/index.html`（英文首页），属于站点自有文件，不要动。
- **语言偏好记忆**：语言互切链接的 `onclick` 把目标语言写入 `localStorage`（key `hapaul-lang`，合法值 `zh-CN` / `en-US`），站点根与应用根的跳转页共用同一份记忆；新应用照抄现有页面的写法即可。

```
works/
├── index.html              # 站点根：语言探测跳转页
├── zh-CN/index.html        # 站点首页（中文）
├── en-US/index.html        # 站点首页（英文）
├── styles.css              # 站点首页样式
├── assets/icons/<app>.png  # 首页卡片图标（首页所有）
├── flashnote/              # 应用子目录：跳转页 + 双语对称
│   ├── index.html          # 应用根：语言探测跳转页
│   ├── zh-CN/…             # 中文内容页
│   ├── en-US/…             # 英文内容页
│   └── images/…
└── <new-app>/              # 新应用照此结构
```

## 2. 图标位置

首页卡片图标统一放在 `assets/icons/<app>.png`（首页所有，与应用子目录解耦——还没有 Homepage 的应用也可以只放图标供未来使用）。建议 1024×1024 PNG；当前 `flashnote.png` 直接取自应用图标。

## 3. 双语登记卡片

首页有两处登记点（`zh-CN/index.html` 中文文案、`en-US/index.html` 英文文案），**各加一个卡片**（四字段：图标、名称、一句话简介、入口链接）。两页现在同为目录下第一层，入口链接统一带 `../` 前缀：

- `zh-CN/index.html`：

```html
<a class="app-card" href="../new-app/">
  <img class="app-card-icon" src="../assets/icons/new-app.png" alt="NewApp">
  <h3 class="app-card-name">应用名</h3>
  <p class="app-card-desc">一句话简介</p>
</a>
```

- `en-US/index.html`（同模板，文案换英文）：

```html
<a class="app-card" href="../new-app/">
  <img class="app-card-icon" src="../assets/icons/new-app.png" alt="NewApp">
  <h3 class="app-card-name">App Name</h3>
  <p class="app-card-desc">One-line description</p>
</a>
```

## 4. 本地自检

接入后、推送前，本地起静态服务验证：

```bash
python3 -m http.server 8123
```

- 打开 `http://localhost:8123/` —— 自动跳转到 `/zh-CN/`（浏览器语言 `zh` 开头）或 `/en-US/`（其余语言）；浏览器禁 JS 时呈现中文 / English 两个手动入口链接；
- 打开 `http://localhost:8123/zh-CN/`、`http://localhost:8123/en-US/` —— 两语言卡片可见、入口 `../new-app/` 可达；
- 打开 `http://localhost:8123/flashnote/` —— 应用根跳转页同样自动落地 `zh-CN/` 或 `en-US/`；
- 应用页内样式 / 图片全部加载、页内互链无断链；
- 确认无误后 commit + push 到任务分支（站点发布由 main 分支的 GitHub Pages 完成，Dev / DM 均不直接操作 main）。
