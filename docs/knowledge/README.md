# 知识库

本项目历次任务沉淀的普适经验：下次还会遇到、对本项目稳定成立的判断方法、可复制的命令与约定。一个主题一个文件；同一主题追加新节，不覆盖已有内容。

| 主题 | 一句话 | 文件 |
|---|---|---|
| 子路径应用集成纪律 | 应用页面挂子路径：全相对路径、快照 diff 校验、CNAME/.nojekyll 不入子目录、双语入口 `../` 互切、照接入文档四步走 | [subpath-app-integration.md](subpath-app-integration.md) |
| 静态站自测与部署顺序 | 本地 `http.server` 全量资源自测（剥 fragment 防误报）；Pages 冷启动先 main 再开通再 DNS；删旧分支前先切默认分支 | [static-site-verification-and-deploy.md](static-site-verification-and-deploy.md) |
