# 月牙胸针：三维形体工程探针

日期：2026-09-21。目的：验证“同一个物体能连续翻到背面，且保留可独立编辑的部件”，以及 GLB 导出/读回流程。**它不是艺术成品，不代表三维修理段已经完成。**

## 直接查看

双击 [index.html](index.html)，在支持 WebGL2 的桌面浏览器打开即可；所需 Three.js 与加载器已打包在本目录的 `viewer.js`，没有 CDN、账号、网络请求或模型服务依赖。

拖动旋转，也可使用正面/侧面/背面按钮或键盘操作角度滑杆。“重新导出 GLB”会下载当前源码生成的模型。页面每次打开都从源码重建形体，然后执行一次 GLB 导出和读回；旋转操作不修改导出的模型姿态。

[brooch-probe.glb](brooch-probe.glb) 是已保存的 190,688-byte GLB，可单独导入 Blender、Godot 或支持 glTF 2.0 的观察器。导入这些软件的兼容性在本实验中尚未逐一实测。

首次探针截图保留原样：[正面](front.png) · [侧面](edge.png) · [背面](back.png)。截图只有形体观察场景；归档版增加了中文说明、角度滑杆和导出按钮。

## 资产与源码

| 文件 | 内容 |
|---|---|
| `viewer-source.js` | 从首次实际执行脚本整理的可读源码；包含轮廓、挤出参数、三个部件、GLB 往返与交互 |
| `viewer.js` | 预构建观察器，包含 Three.js 0.180.0 和所用 addons，可离线直接运行 |
| `brooch-probe.glb` | 从归档观察器实际点击导出得到；glTF 2，三个 mesh |
| `front.png` / `edge.png` / `back.png` | 首次探针实际 Playwright 截图，从 `/tmp` 归档，未重绘 |
| `original-probe.json` | 首次探针字节数、节点名和拖动结果 |
| `verification.json` | 归档版本的离线打开、按钮、拖动、导出检查结果 |
| `package.json` / `package-lock.json` / `build.mjs` | 固定 Three.js 0.180.0、esbuild 0.28.2 的重建入口 |
| `Three-LICENSE.txt` | Three.js 与本次使用的 addons 的 MIT 许可 |

月牙轮廓来自本作品 `src/objects.ts`，通过 `SVGLoader` 转为形状后挤出；模型不是 AI 生成。三个 mesh 的节点名为 `moon_body`、`hinged_pin`、`socket`。`hinged_pin` 只是部件名称，当前没有铰链约束或合针动画。针、扣座是圆柱/盒子占位；尺寸为测试单位，不是珠宝生产规格。

尚未制作：孔距与缺口、雕纹、旧银表面、玻璃石、接触阴影、正确机械结构、抓取/装配、角色手爪、音效。当前金属材质与两盏方向光仅帮助看清体积，不能据此评价最终美术质量。

## 从源码复现

直接观看无需安装依赖。只有修改/重新打包观察器时，在本目录运行：

```bash
npm ci
npm run build
```

构建只更新本目录 `viewer.js` 和 Three.js 许可文件。重新打开 `index.html`，点击“重新导出 GLB”，即可重建模型文件。无需重新运行生成模型或访问素材服务。

本轮使用 Node 24.20.0、Three.js 0.180.0、esbuild 0.28.2；浏览器验证为 Playwright Chromium（本环境 build 1234）+ SwiftShader 软件渲染。已实际断网通过 `file://` 打开，确认外部 HTTP/HTTPS 请求为 0、无 pageerror；按钮到 90°/180°、真实拖动、GLB 下载成功，下载文件与首次探针均为 190,688 bytes。该结果不能替代其他浏览器、目标设备或原生引擎性能验证。

另在独立临时目录按锁文件执行 `npm ci --ignore-scripts --no-audit --no-fund` 与 `npm run build`，重建成功。仓库内未保留 `node_modules`。

研究上下文见[空间技术评审](../../tech-spatial-worlds.md)；动作目标见[交互对照与分镜](../../interaction-benchmark.md)。
