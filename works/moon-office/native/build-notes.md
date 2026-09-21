# 原生样段：工具链、便携包与验证

记录日期：2026-09-21。目标接收者的操作系统尚未确认；本轮准备 Linux x86_64、Windows x86_64 未签名便携 ZIP，以及 macOS Universal 未签名 `.app` ZIP。接收者运行导出的程序，不需要 Godot 编辑器、Python、模型工具或联网。没有签名、公证或安装器交付承诺。

## 固定工具链

- 官方当前稳定下载页为 [Godot 4.7.2 standard](https://godotengine.org/download/linux/)，发布日期 2026-08-18；没有选择预览版或 .NET 版本。
- 实际 `--headless --version`：`4.7.2.stable.official.ed1daf0bf`。
- 本机编辑器：`/home/ubuntu/.local/share/oncewhere-tools/godot/4.7.2-stable/Godot_v4.7.2-stable_linux.x86_64`。
- 本机模板：`/home/ubuntu/.local/share/godot/export_templates/4.7.2.stable/`。官方模板全集归档保留在工具目录，解出 Linux、Windows x86_64 的 release/debug 模板、macOS Universal `macos.zip` 与 `version.txt`。
- 版本与官方 GitHub release API 提供的 SHA256 固定在 [toolchain.json](tools/toolchain.json)，[bootstrap.py](tools/bootstrap.py) 下载后先核验再解压。下载源为 [官方 godot-builds 4.7.2-stable release](https://github.com/godotengine/godot-builds/releases/tag/4.7.2-stable)。

| 官方归档 | SHA256 |
|---|---|
| `Godot_v4.7.2-stable_linux.x86_64.zip` | `cadd3204e728a35d3f13adb7fd0d7902636b79f6b95c40c265eb73b6c35329e4` |
| `Godot_v4.7.2-stable_export_templates.tpz` | `f298490b8d44d934be425a5a65a51bf15f422428b229a06a6e11d9ffea248011` |

重新准备工具与构建（从本目录运行）：

```bash
python3 tools/bootstrap.py
./tools/godot.sh --headless --version
python3 tools/build.py
```

编辑器与模板由制作方使用。导出使用 release 模板、嵌入式 PCK；ZIP 内附 Godot MIT 许可、作品说明、构建清单与可用的资产许可记录。导出程序与 ZIP 的 SHA256 记录在 `dist/build-manifest.json` 和 `dist/SHA256SUMS.txt`。完整导出包生成后再填写下方实际结果。

## 容器中的真实图形启动

补齐环境中的 X11 运行库与 QA 工具：`libxcursor1 libxinerama1 libxi6 libxrandr2 libxtst6 xdotool mesa-utils python3-pil`。这是本台制作/测试容器的准备步骤，不是接收者安装清单。

```bash
python3 tests/check_renderer.py
```

已通过真实 Xvfb 画面测试：`OpenGL 4.5 Core Profile / Mesa 26.0.8-1ubuntu0.3 / llvmpipe (LLVM 21.1.8, 256 bits)`，Godot `gl_compatibility` / `opengl3`。测试创建三维网格、灯光与相机，在图形窗口中完成绘制，再保存 640×360 PNG；已查看图像内容。证据位于 `test-results/toolchain/compatibility.png` 与 `compatibility.log`，属于可重新生成的本地产物。

驱动不能切换 VSync，启动有对应警告；不妨碍本次绘制。容器没有实际 GPU，这项结果不能外推为接收设备的帧率、最低配置或 Forward+ 画面验收。首轮原生样段采用 Compatibility，以本环境中实际可验证的画面为准。

## 当前验证范围

| 项目 | 状态 |
|---|---|
| 官方编辑器与模板 SHA256 | 已通过 |
| Headless 版本启动 | 已通过 |
| Xvfb Compatibility 三维绘制及截图 | 已通过 |
| 主场景真实窗口启动、输入与截图 | 已通过：Xvfb 真实窗口完成初始画面、R 翻面、扣件尝试、L 递灯与窗口关闭；截图在 `test-results/native-source-final/` |
| 错误件受阻、正确合针 | 已实现并通过交互链路；本样段暂未加入存档功能 |
| Linux 导出 ZIP 解压后的真实启动 | 已通过：导出二进制在 Xvfb 中启动、交互和关闭；截图在 `test-results/native-exported-final/` |
| Windows 导出及 ZIP/PE 结构核验 | 已通过：`tests/check_packages.py` 检查 ZIP CRC、嵌入 PCK、PE x86_64、许可文件 |
| Windows 系统实际启动 | 未测试：本环境是 Linux |
| macOS Universal 导出及 app/PCK/Mach-O 结构核验 | 已通过：`tests/check_packages.py` 检查 ZIP CRC、app bundle、Universal Mach-O、PCK 与许可文件 |
| macOS 实际启动、签名或公证 | 未测试：本环境是 Linux；当前包未签名 |

导出机制依据 [Godot Linux 导出说明](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_linux.html)、[Windows 导出说明](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_windows.html) 与 [命令行文档](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html)。这些文档说明工具能力；交付是否可用仍以上述实际测试为准。

## 本次样段导出记录

`dist/build-manifest.json` 与 `dist/SHA256SUMS.txt` 保存了本次构建的完整哈希。固定 Godot 4.7.2 Compatibility 导出结果如下：

| 包 | 大小 | SHA-256 |
|---|---:|---|
| `moon-office-native-linux-x86_64.zip` | 34,929,605 bytes | `9daa87c3183f72fd048f33c21aba25f63d9161def43c3ec67b6dd62cb4bfd3f6` |
| `moon-office-native-windows-x86_64.zip` | 44,581,919 bytes | `4a8965136a8ff3dac526bfe0e70494518d6fbf1fbb3cc0a47db40d6b27ade25d` |
| `moon-office-native-macos-universal.zip` | 66,971,681 bytes | `990c080eadad2a06a6bf718ff336167af28974071e7ca71e164f553276958d5a` |

程序是未签名便携包；Windows 与 macOS 系统实际启动仍未在本台 Linux 制作环境中验收。
