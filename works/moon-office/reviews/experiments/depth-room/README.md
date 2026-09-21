# 单图空间重建：真实运行的小样

日期：2026-09-21。研究探针，不是作品的新美术成品，不作为最终交付格式选择。

从本作柜台插画，实际运行 Microsoft MoGe-2 的小模型，获得点图、深度与相机内参，构造有纹理的三维表面，在本地浏览器转动查看。

作品开发服务器运行时，可打开 [空间实验](http://localhost:4173/reviews/experiments/depth-room/index.html)。也可在本目录用任意静态 HTTP 服务器打开 [index.html](index.html)。依赖已经打包，不需要在线 CDN；此研究页会读取 GLB／JSON，因此没有承诺直接 `file://` 打开。代码与生成资产可导入其他运行时，浏览器只是本轮的审样工具。

## 实际结果

![原始视点的重建表面](view-0.webp)

[小幅转头 4°](view-4.webp) · [转动 18° 的连续表面](view-18.webp) · [同角度切开深度断层](view-18-cut.webp)。截图已逐张实际查看。

小幅视点变化能带来柜台、人物与柜墙之间的视差。但 4° 时灯、耳朵、书边等处已可见拉伸；18° 时明显拉破。切开深度断层可以避免把前后物体连成幕布，却会露出没有数据的黑色缺面；甚至原始视点也会因粗网格切边而出现细缝。

因此演示同时提供“连续表面”和“切开断层”，让这个后处理取舍可见。不能把切面策略造成的全部缺口归咎于模型，也不能把连接表面的纹理拉伸当作完整体积。它估计的是原图中可见的表面；原图背后没有提供的纹理、人物背部与抽屉内部并未被补出。

**本次判断：** 这条轻量路线适合进一步研究有限视差／窄角镜头，不足以直接把这幅图变成可自由行走、能拿起物件的完整房间。Marble 的场景生成、TRELLIS.2 的独立资产生成、MoGe 的表面估计是不同路线，本实验不替代前两者的质量测试。

## 实测记录与限制

- 模型：[`Ruicheng/moge-2-vits-normal`](https://huggingface.co/Ruicheng/moge-2-vits-normal)，35M 参数级；模型卡 MIT，修订固定为 `26b477f41595707c5db6770294c0d1721e8ed4ed`。
- 代码：[`microsoft/MoGe`](https://github.com/microsoft/MoGe)，读取并执行的修订 `74fbce054ebed49800de42d0ad0e83495065719a`，使用 `moge.model.v2`，没有运行 MoGe-3。上游已于 2026-08-18 发布 MoGe-3；它的新细节能力本轮未测。
- 输入：[本作 office 原图](../../../assets/art-source/office.png)，1586×992；推理输入缩至 800×500，`resolution_level=3`。网页纹理也使用该推理输入，不能将其清晰度直接等同原始插画上限。
- 设备：本机 CPU，8 个推理线程，PyTorch `2.14.0+cpu`；没有使用 CUDA，也没有调用付费生成 API。
- 两次推理分别约 **2.980 秒、1.879 秒**，均不包含权重下载、模型载入、网格构造和浏览器渲染。仅两次小模型试跑，不是性能基准，不能推广到 MoGe-3、其他图像或接收者设备。
- 网格采样间隔为 3；44,589 顶点；连续表面 88,312 三角形，切开断层后 82,574 三角形。推断的深度尺度没有真实测量基准，不能当作柜台实际米数。
- Chromium + SwiftShader 实际载入 GLB，并点击 0°／4°／18°、切面与网格控件；未发现 pageerror。截图不证明真实 GPU 或手机帧率，未测连续帧性能。

机器可读结果：[metrics.json](metrics.json)。软件环境：[environment.freeze.txt](environment.freeze.txt)。原始数值预测留在仓库忽略的 `work/moon-depth-research/`，没有放入发布应用。

## 文件与复现

- [infer.py](infer.py)：模型推理与两种 GLB 导出；需传入上游仓库路径。模型修订已固定，输出的下载/载入时间不计入推理计时。
- [office-surface.glb](office-surface.glb)、[office-surface-cut.glb](office-surface-cut.glb)：实际重建资产。
- [viewer-source.js](viewer-source.js)：Three.js 查看器源代码；[viewer.js](viewer.js)为打包的本地运行文件。
- [office-original.webp](office-original.webp)：对比用的本作原始插画压缩副本。
- [MoGe 代码许可](MoGe-LICENSE.txt)与 [Three.js 许可](Three-LICENSE.txt)。MoGe 代码主体 MIT、其 DINOv2 部分 Apache 2.0；模型许可由上述模型卡单独核验。

复现思路：创建独立 Python 3.11 环境，安装 CPU 版 torch／torchvision 及冻结环境中的依赖；检出上述 MoGe 修订；运行 `python infer.py --moge-repo /path/to/MoGe`。这里没有把 MoGe-3 的 CUDA/Triton 完整开发环境装进作品依赖，只安装本次 v2 推理所需依赖。

查看器使用 Three.js，可用 esbuild 将 `viewer-source.js` 打包为 ESM；运行文件已保留，不必为了看结果重新构建。此目录没有改动当前作品的任何场景、状态或依赖。
