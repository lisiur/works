# 知识库

本项目历次任务沉淀的普适经验：下次还会遇到、对本项目稳定成立的判断方法、可复制的命令与约定。一个主题一个文件；同一主题追加新节，不覆盖已有内容（结构性改写需有明确的任务决议，如 ISSUE-124 的构建体系切换、ISSUE-129 的页面与多语言文案解耦）。

| 主题 | 一句话 | 文件 |
|---|---|---|
| 子路径应用集成纪律 | 根路径语言跳转页 + `/{语言}/` 语言子树（站点与应用对称）：站内链接根绝对路径（index 页目录形态、内容页 `.html` 形态）、语言记忆 `hapaul-lang` 站点级一份、应用清单数据登记接入、页面单份 + 文案字典 + 语言登记单一来源、CNAME 归 `public/` | [subpath-app-integration.md](subpath-app-integration.md) |
| 静态站自测与部署顺序 | Astro 产物级自测（`pnpm verify`：剥 fragment 断链 sweep + 地址清单 + 跳转用例矩阵与落地段断言，期望清单由语言登记与页面模板推导；`pnpm preview` 人工过产物）；Pages legacy → GitHub Actions 切换顺序；删旧分支前先切默认分支 | [static-site-verification-and-deploy.md](static-site-verification-and-deploy.md) |