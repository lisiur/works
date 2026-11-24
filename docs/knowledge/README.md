# 知识库

本项目历次任务沉淀的普适经验：下次还会遇到、对本项目稳定成立的判断方法、可复制的命令与约定。一个主题一个文件；同一主题追加新节，不覆盖已有内容。

| 主题 | 一句话 | 文件 |
|---|---|---|
| 子路径应用集成纪律 | 根路径语言跳转页 + `zh-CN/`/`en-US/` 双语目录（站点与应用对称）：全相对路径、语言记忆 `hapaul-lang` 站点级一份、快照 diff 校验、CNAME/.nojekyll 不入子目录、照接入文档四步走 | [subpath-app-integration.md](subpath-app-integration.md) |
| 静态站自测与部署顺序 | 本地 `http.server` 全量资源自测（剥 fragment 防误报）；语言跳转页四类行为自测口径；Pages 冷启动先 main 再开通再 DNS；删旧分支前先切默认分支 | [static-site-verification-and-deploy.md](static-site-verification-and-deploy.md) |
