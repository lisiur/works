# 新增应用 Homepage 接入约定

本站点（apps.hapaul.top）是纯静态 GitHub Pages 站点，发布根 = 仓库根，**无构建步骤**。新增一个应用 Homepage = 「建子目录 + 放图标 + 登记两张卡片」，照本文四步做即可，不需要改任何构建配置。

## 1. 目录契约

- 每个应用一个子目录，名为**小写应用名**：`flashnote/`、`gitpeek/`、`pinecone/`…
- 应用官网的全部资源（页面、样式、图片、截图）**只放在自己的子目录内**，与站点其他部分互不引用。
- 站内互链一律使用**相对路径**（子目录内部页面之间、指向首页用 `../index.html`），不要写根绝对路径（`/xxx`）和绝对域名，保证任意子路径下都能打开。
- 首页在仓库根（中文）与 `en/`（英文），属于站点自有文件，不要动。

```
works/
├── index.html              # 站点首页（中文）
├── en/index.html           # 站点首页（英文）
├── styles.css              # 首页样式
├── assets/icons/<app>.png  # 首页卡片图标（首页所有）
├── flashnote/              # 应用子目录：应用官网内容原样存放
│   ├── index.html
│   ├── en/…
│   └── images/…
└── <new-app>/              # 新应用照此结构
```

## 2. 图标位置

首页卡片图标统一放在 `assets/icons/<app>.png`（首页所有，与应用子目录解耦——还没有 Homepage 的应用也可以只放图标供未来使用）。建议 1024×1024 PNG；当前 `flashnote.png` 直接取自应用图标。

## 3. 双语登记卡片

首页有两处登记点，**各加一个卡片**（四字段：图标、名称、一句话简介、入口链接）：

- `index.html`（中文文案），在 `apps-grid` 里追加，入口链接写 `new-app/`：

```html
<a class="app-card" href="new-app/">
  <img class="app-card-icon" src="assets/icons/new-app.png" alt="NewApp">
  <h3 class="app-card-name">应用名</h3>
  <p class="app-card-desc">一句话简介</p>
</a>
```

- `en/index.html`（英文文案），注意链接带 `../` 前缀：

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

- 打开 `http://localhost:8123/` —— 新卡片可见、点击进入应用页；
- 打开 `http://localhost:8123/en/` —— 英文卡片可见、入口 `../new-app/` 可达；
- 应用页内样式 / 图片全部加载、页内互链无断链；
- 确认无误后 commit + push 到任务分支（站点发布由 main 分支的 GitHub Pages 完成，Dev / DM 均不直接操作 main）。
