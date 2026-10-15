# oncewhere · 作品展示包

## 获取展示包

oncewhere 仓库已公开，浏览源码、文档和截图无需另行申请权限。通过 GitHub 网页下载 Actions 构建包仍需登录 GitHub：进入 [Build oncewhere showcase](https://github.com/yuan-chengzhi/oncewhere/actions/workflows/showcase.yml) 的成功运行页面，在 **Artifacts** 中选择 **`oncewhere-showcase`**。登录要求见 [GitHub 官方下载说明](https://docs.github.com/zh/actions/how-tos/manage-workflow-runs/download-workflow-artifacts)。

展示包按当前工作流设置保留 30 天。找不到包时，请查看较新的成功运行，或参照[作品构建方法](https://github.com/yuan-chengzhi/oncewhere/blob/main/works/moon-office/README.md)自行构建。GitHub 上本目录中的 `index.html` 是展示页源码模板；完整作品和对应截图需要使用构建后的展示包，而不是单独保存模板。

## 解压后打开

用桌面浏览器打开 `index.html`：先看作品介绍与真实截图，再点击“进入第一夜”。也可以直接打开 `moon-office.html`；文件取得后，本地体验无需开发环境、账号或服务器，支持离线打开。手机系统的文件预览器未必支持完整交互，建议先用桌面浏览器体验。

`moon-office.html` 是完整互动收藏版；作品结尾导出的静态值班记录是另一份文件。`web/` 保留可部署的普通静态网站版本，**不表示已有在线试玩站点**；不要把 GitHub 源文件页面当成游戏预览地址。

本包是既有作品的展示整理，不是新的作品版本或观众验收结果。已做哪些测试以对应构建记录为准，不能将自动化浏览器检查解释为真实手机、跨浏览器或人工听感验收。

原作品与项目范围说明见 `CREDITS.md`。`MANIFEST.json` 记录构建提交与哈希，不包含账号凭证。包内不包含 Git 历史、私人访谈、未整理的故事或 Godot 原生样段。
