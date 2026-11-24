# 新增应用 Homepage 接入约定

本站点（apps.hapaul.top）由 Astro 构建、GitHub Actions 自动发布。接入一个新应用 = 「登记一条应用数据 + 放图标 + 写该应用自己的页面内容」；站点层（双语首页卡片、页脚链接、应用跳转页、返回主站入口）由共享布局与应用清单数据自动生成，**全程不需要改动任何站点层文件**。

## 0. 工程命令

```bash
pnpm install        # 安装依赖（锁文件入库）
pnpm dev            # 本地开发（源码模式，仅供写页面时预览）
pnpm build          # 构建产物到 dist/（验收对象是产物）
pnpm verify         # 构建 + 产物级自测（断链 sweep、地址清单、语言跳转用例）全绿
pnpm preview        # 对构建产物起本地服务（http://localhost:4321）
```

## 1. 登记应用数据（唯一登记点）

编辑 `src/data/apps.ts`，在 `apps` 数组追加一条 `AppEntry`：

```ts
{
  id: 'newapp',                                   // 子路径 → /newapp/
  icon: '/assets/icons/newapp.png',               // 卡片图标，根绝对路径
  jumpTitle: 'NewApp',                            // 跳转页 <title>/<h1>/卡片 img alt
  jumpDescription: 'NewApp — 一句话 · One line.', // 跳转页 description
  zh: { name: '应用名 NewApp', tagline: '一句话简介', shortName: '应用名' },
  en: { name: 'NewApp', tagline: 'One-line description', shortName: 'NewApp' },
}
```

| 字段 | 用在哪 |
|---|---|
| `id` | 子路径；`/newapp/` 跳转页由 `src/pages/[app]/index.astro` 自动生成 |
| `icon` | 两张语言首页卡片的图标（卡片 `<img alt>` 用 `jumpTitle`） |
| `jumpTitle` / `jumpDescription` | 应用跳转页 `<title>` / `<h1>` / description / hreflang 自指 |
| `zh.name` / `en.name` | 卡片名称与首页页脚链接文案 |
| `zh.tagline` / `en.tagline` | 卡片一句话简介 |
| `zh.shortName` / `en.shortName` | 应用内容页导航与页脚 logo 短名 |

登记后构建：双语首页自动出现对应语言的卡片与页脚链接，`/newapp/` 自动出现跳转页（同一段探测脚本 + 禁 JS 双入口）——不改首页、跳转页、导航页脚组件中的任何一个。

## 2. 图标位置

首页卡片图标统一放在 `public/assets/icons/<app>.png`（建议 1024×1024 PNG）。`public/` 下的文件按原路径原样进入产物：`public/CNAME`、`public/assets/**`、`public/<app>/images|screenshots/**`。

## 3. 应用页面内容

- **跳转页不用写**：`/newapp/` 由应用清单数据自动生成。
- **内容页**：放 `src/pages/<app>/zh-CN/*.astro` 与 `src/pages/<app>/en-US/*.astro`，复用共享布局——参照 FlashNote 的做法：应用自有 `xxxLayout.astro` 包一层共享的 `src/layouts/AppLayout.astro`，传入本应用的导航项、页脚项与版权行；页面只写自己的 head 元信息与正文区。
- **返回主站入口不用写**：内容页 `nav-links` 与 `footer-links` 首位的「全部应用 / All Apps」由 `AppLayout.astro` 统一置入（落主站对应语言首页并写入 `hapaul-lang`，try/catch 静默失败），页面不需要也不能手写。
- **语言互切不用写**：`lang-pill` 由布局生成，index 页落目录形态（`/<app>/<另一语言>/`）、其余页落 `.html` 形态。
- **链接写法**：站内链接一律根绝对路径；index 页目录形态（`/zh-CN/`、`/newapp/zh-CN/`），内容页 `.html` 形态（`/newapp/privacy.html`）；带锚点的 index 目标写目录形态 + fragment（`/newapp/zh-CN/#features`）。外链（应用商店、mailto）原样写。

## 4. 本地自检

```bash
pnpm verify     # 断链 0、地址清单、跳转用例全绿
pnpm preview    # http://localhost:4321 逐页人工过一遍
```

- `scripts/verify-links.mjs` 顶部的期望清单（HTML 路径 + 12 种地址）与站点页面清单一一对应——**接入新应用后同步更新该清单**（新增 `newapp/index.html`、`newapp/<locale>/…` 与对应地址），再跑 `pnpm verify`；
- `http://localhost:4321/newapp/` 自动落 `/newapp/zh-CN/`（浏览器语言 zh 开头）或 `/newapp/en-US/`；禁 JS 呈现中文 / English 手动入口；
- `http://localhost:4321/zh-CN/`、`http://localhost:4321/en-US/` 两语言卡片可见、入口可达；
- 内容页样式 / 图片全部加载、页内互链无断链（`pnpm verify` 已覆盖）；
- 确认无误后 commit + push 到任务分支；合并 `main` 由 Lead 在收尾阶段执行，GitHub Actions 随 push 自动构建发布。
