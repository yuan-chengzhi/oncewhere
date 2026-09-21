# 空间与可操作物件：能够改变《月背拾遗司》形态的技术路线

核查日期：2026-09-21。范围：World Labs Marble / Spark、图生三维资产、GLB 与网页/原生引擎交付；已做两个轻量浏览器探针，另一次复杂演示尝试失败。未改作品应用。用户随后明确：最终交付不必是 HTML，可以由我们下载安装、配置并包装桌面应用；据此补充第 7 节，不再把浏览器限制作为形式上限。

**值得尝试的改变有两条：让玩家真正走近柜台的“空间场景”，以及让胸针成为能拿起、翻转、装配的“三维物件”。前者已可由 Marble + Spark + 碰撞网格提供明显起点，后者可由生成资产与精确建模混合完成。二者解决不同问题，可以组合，也可以只选择其中一个。当前最有把握的第一步是三维胸针；最可能改变整部作品形式的是可探索的微缩收藏盒。**

## 1. 先分清生成结果的五个层次

| 得到的东西 | 能直接带来什么 | 仍需制作什么 |
|---|---|---|
| 全景图 | 转头环顾，空间气氛 | 平移后的真实视差、遮挡与背面 |
| Gaussian splat 场景 | 从多个视点看有体积与遮挡的空间 | 物体身份、抽屉铰链、碰撞与游戏规则；原有光照通常写在外观中 |
| 碰撞 mesh | 相机/物体与桌、墙、地面的接触计算 | 漂亮材质、细小扣件配合、哪些抽屉能开；碰撞网格不是成品视觉模型 |
| 带 PBR 材质的 GLB mesh | 重新照明、旋转、编辑几何，导入常见运行时 | 合理拓扑、部件拆分、轴心、装配槽位、骨骼与动画、接触逻辑 |
| 有结构和状态的场景 | 抽屉可开，胸针可拿，零件可装，人物可回应 | 正是作品制作本身；目前核查到的生成工具没有替本作自动完成这一层 |

Gaussian splatting 是一类场景表示与渲染方法，原始论文聚焦实时新视点渲染，不应把算法名视为“一键生成可玩的世界”。也不能说 splat 完全不可编辑：Spark 已提供选择区域、变换、颜色编辑、逐点修改与骨骼变形接口；缺的是从画面自动获得可靠的“这是扣件，它以这里为轴转动”的结构。[3DGS 原始论文项目页](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/)、[Spark 编辑文档](https://sparkjs.dev/docs/splat-editing/)、[SplatMesh 接口](https://sparkjs.dev/docs/splat-mesh/)

## 2. 路线 A：生成空间外观，独立制作可操作物件

**作品形式：能靠近的拾遗司。** 玩家可从柜台前向左探身，看标签背后的字，靠近第七号抽屉；抽屉里的胸针是独立 mesh，能拿起来。窗、柜墙和大量小装饰用 splat 保留细密绘画质感，桌面/抽屉/胸针承担精确操作。

### 已核实的工具能力

- **Marble 不是只输出视频。** World API 支持文本、图像、多图、全景、视频输入，生成持久可下载资产；响应含 100k、500k 与 full-resolution SPZ、GLB collider、全景图。另有 PLY 导出与高质量 mesh 导出。当前模型名包含 `marble-1.0-draft`、`marble-1.0`、`marble-1.1`、`marble-1.1-plus`。[API 快速开始](https://docs.worldlabs.ai/api)、[API FAQ](https://docs.worldlabs.ai/api/faq)
- **构图可以先约束。** Chisel 支持粗几何布局、墙体、相机位置与 GLB/FBX 参考几何输入。因此可以先定柜台深度、窗户位置、活动范围，再生成外观，不必只靠文字反复碰运气。[Chisel 官方说明](https://docs.worldlabs.ai/marble/create/chisel-tools/chisel-basics)
- **高质量 mesh 与 collider 明确不同。** 官方列 collider 约 100–200k 三角形；高质量输出约 600k 三角形带纹理、另一个约 1M 顶点色版本。官方说明高质量 mesh 可有薄结构、反光、透明、未覆盖区域导致的孔洞与浮面；典型贴图模型约 100–200MB，导出可达一小时。不能直接以它作为移动网页近景扣件。[格式规格](https://docs.worldlabs.ai/marble/export/specs)、[Mesh export](https://docs.worldlabs.ai/marble/export/mesh)
- **Spark 已能将 splat 与 mesh 放在同一 Three.js 场景。** 基于 WebGL2，接受 SPZ、PLY、SPLAT、KSPLAT、SOG 等格式，支持多个 splat 物体排序与动态编辑；项目 MIT。官方移动端性能数字是预算建议，不是本作性能保证。[官方仓库](https://github.com/sparkjsdev/spark)、[性能建议](https://sparkjs.dev/docs/performance/)

### 物理与抓取有现成证据，但不是生成自带

World Labs 官方推荐的 [Spark Physics](https://docs.worldlabs.ai/api/interactive-world-examples) 有公开 [仓库](https://github.com/bmild/spark-physics) 与[网页演示](https://spark-physics.netlify.app)。我读了当前 `src/main.js`：

- 环境 GLB 几何单独转成 Rapier `trimesh`，挂在 fixed rigid body 上；SPZ 负责外观。
- 动态积木、投射物与角色是另外的几何体/模型；点击抓取只对映射过的物理对象生效。
- 它证明“静态生成空间 + 独立动态物件”是已存在的组合，不证明可以随手把 splat 中任何一盏灯拔下来。当前源码的调试键是 `M`；README 仍写 `Space`，说明参考项目也须实际读码，不能把 README 当已验证行为。

**迁移到本作时的关键工作：** 把原画中胸针、可开抽屉、两人需要活动的爪子从背景外观里清走，再放入独立资产；否则拿起新胸针后，背景里会留着原来的“幽灵胸针”。给墙、柜台、抽屉建立足够简洁的代理碰撞；给角色补正确遮挡与接触阴影。Spark 的 raycast 可以命中 splat，但官方说明它同步遍历大量点，不适合每帧对数百万点执行；拖拽物件应主要命中少量代理 mesh。[SplatMesh raycast 文档](https://sparkjs.dev/docs/splat-mesh/)

### 门槛与许可

| 项目 | 本轮确认 |
|---|---|
| Marble Web | Free 有有限生成额度；Standard 当前 $20/月，含 splat 与 collider 导出；Pro $35/月，含高质量 mesh 与价目页列出的商业权利。需账号。[价目](https://marble.worldlabs.ai/pricing) |
| Marble API | 独立账本，最低充值 $5，1250 credits/$1；标准文本或普通单图生成 1580 credits，即 $1.264；draft 对应 230 credits，即 $0.184；高质量 mesh 导出另计 3500 credits，即 $2.80；PLY 转换免费。1.1 Plus 可能额外计费。这些是接口生成费，不含重试、返工与制作成本。[API 价格](https://docs.worldlabs.ai/api/pricing) |
| 商业使用边界 | TOS 3.3(b)(d)写付费账号/API 输出可用于商业目的；网页价目把 commercial rights 列在 Pro 起，两处表述粒度不同。本轮不据此承诺 Standard 商用。免费时生成的输出不会因后来付费自动改权利。[TOS](https://docs.worldlabs.ai/terms-of-service) |
| 开源依赖 | Spark、Three.js、该 physics 示例为 MIT；Rapier.js 为 Apache-2.0。模型/音频等素材仍须独立核对。不要把原始 INRIA 3DGS 仓库也一概称为商用 MIT；其参考实现另有非商业研究/评估许可。[Spark](https://github.com/sparkjsdev/spark)、[Three.js](https://github.com/mrdoob/three.js/blob/dev/LICENSE)、[Rapier.js](https://github.com/dimforge/rapier.js/blob/master/LICENSE)、[原始 3DGS 许可](https://github.com/graphdeco-inria/gaussian-splatting/blob/main/LICENSE.md) |
| 本机可试到哪里 | 已跑通浏览器 SPZ 渲染；没有使用用户账号、提交生成请求或购买额度。没有核实可用 Marble API 凭据。当前环境缺少可用 NVIDIA 推理设备，适合浏览器功能探针，不能代表真实手机速度 |

**预期表现增益：** 场景入口从抽象星号变成真实空间位置；走近物件时有视差，人物和桌沿能遮住物体，开柜和归位有固定地点。

**主要代价：** 生成空间的未见区域需要艺术判断；若把角色一起生进静态 splat，人物仍不会表演。现有单 HTML 收藏版约 8.66MiB；新的几何、贴图与 splat 很可能改变下载和离线交付规模，需重新测量，不能承诺等体积。

## 3. 路线 B：以可操作 GLB 为核心的修理台 / 收藏盒

**作品形式：桌上的第七号盒子。** 打开盒盖，抽屉内每件东西都能拿起来、翻面、触发一个记忆片段。故事用物体的位置与共同操作展开，角色只在修理关键时刻进入近景。无需先生成完整可行走房间。

### 图生三维已跨过“只能看渲染”的阶段

Microsoft TRELLIS.2 官方代码是 4B image-to-3D 模型，输出几何与 base color / roughness / metallic / opacity 等材质；示例使用后处理导出 `sample.glb`。仓库写模型与代码 MIT，Linux、至少 24GB NVIDIA 显存，性能表来自 H100。它是制作资产工具，不在用户手机上运行生成。[官方仓库与安装要求](https://github.com/microsoft/TRELLIS.2)、[导出示例](https://github.com/microsoft/TRELLIS.2/blob/main/example.py)、[研究项目页](https://microsoft.github.io/TRELLIS.2/)

这对带细节的灯、盒子、石头、旧工具有真实生产价值。但“能生成复杂拓扑”不是“精确保留指定两孔间距”，也不保证扣件、针、月牙分别成节点。**建议把胸针的外观与机械接口分开制作：** 月牙、孔位、方缺口和铰链轴按现有矢量尺寸建模；雕纹、旧银表面、布料与背景道具可以用生成资产辅助。最终统一整理成含命名节点、正确轴心和碰撞代理的 GLB。

TRELLIS.2 的 nvdiffrast、nvdiffrec 等依赖有各自条款；官网展示材料另写仅学术研究用途，不能把项目展示页上的成品模型当作 MIT 赠送资产。自己的授权输入、模型/代码许可、依赖许可与展示素材四者应区分。本轮没有运行该大模型或使用其展示资产。

### 为何 Three.js / Godot 是不同制作选择

| 运行时 | 对本作的实际优势 | 边界 |
|---|---|---|
| Three.js + 原 HTML 阅读层 | 现有网页可保留文本、键盘与收藏逻辑，核心物件放入一个 canvas；GLTFLoader 可读取场景节点、材质与动画；可用拖动和确定性时间线制作装配 | 需要自己组织输入状态、焦点、动画、内存与资源释放。引入模型不会自动改善人物动作。[GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)、[DragControls](https://threejs.org/docs/pages/DragControls.html) |
| Godot | 当作品确实转成多场景小冒险时，场景树、动画编辑、物理和原生桌面/移动交付更集中；MIT 引擎 | Godot 4 Web 当前要求 WebAssembly/WebGL2、使用 Compatibility renderer，C# 项目当前不能 Web 导出；多线程需额外隔离条件。单线程已可用，但真实手机还需测，网页音频也有模式差异。[Web 导出文档](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)、[许可](https://godotengine.org/license/) |

本作修扣件可优先用受控装配状态：拿起 → 对齐 → 受阻/落位 → 合针 → 锁定。自由刚体物理可以用于掉落与试提，不宜让核心成功依赖真实微小金属碰撞误差。三维提供准确厚度和遮挡，导演仍控制节奏与容差。

### 已执行的小探针

用当前胸针 SVG 的月牙轮廓创建 `ExtrudeGeometry`，加独立针、扣座节点，GLTFExporter 导出后再经 GLTFLoader 读取；没有改应用文件，也没有安装项目依赖。临时浏览器页面使用 Three.js 0.180.0、Chromium + SwiftShader，800×600。

实际 Playwright 拖动至侧面、背面，GLB 数据 190,688 bytes；读取回来的节点包括 `brooch`、`moon_body`、`hinged_pin`、`socket`；最终 Y 旋转约 3.144 rad，无 pageerror。已用 `view_image` 检查三张截图，侧面能看到厚度，背面能看到针与扣座。现已归档为[独立实验包](experiments/brooch-3d/README.md)：包含可直接离线打开的[观察器](experiments/brooch-3d/index.html)、可重建源码、[GLB](experiments/brooch-3d/brooch-probe.glb)、原始三截图与 Three.js 许可。[挤出几何官方文档](https://threejs.org/docs/pages/ExtrudeGeometry.html)

**这个探针只证明：同一物体连续翻到背面、部件结构与 GLB 流程可在当前工具下成立。** 它没有雕纹、正确金属反射、孔位、接触阴影、碰撞或合针动画；外观只是技术模型，不是艺术升级已经成功。其价值是把需要购买算力的资产生成与现在就能检验的交互结构分开了。

## 4. 另一种值得认真比较的作品：自由视角微缩剧场

把“月背拾遗司”做成一件能捧在手里旋转的开口木柜。正面是两位值班员的舞台；稍转到侧面，看到回声山谷嵌在抽屉侧壁；拉出第二层，车票变成一小段铁道。胸针在不同空间之间搬运，但始终是同一个物件。

这与五张背景顺序换景有三个实质差别：

1. 玩家自己决定何时靠近、退远与翻到另一侧，场景关系通过空间记住。
2. 结尾留下可重访的收藏盒；能直接取出物件，收藏形式与首次体验统一。
3. “两个人都够得到的位置”可以由抽屉高度与摆放位置表现，而不只是一句台词。

技术上可用轻量 mesh 木柜 + 分层绘画小舞台 + 关键 GLB 道具；远处氛围有需要再加入 splat。这样拥有立体结构和物体连续性，同时保留本作的绘画审美。它是另一种值得做小样比较的形式，不是给现有页面加一个旋转特效。

## 5. 最小可证伪实验与决策门槛

以下指标是拟定的实验标准，不是已测结论。

| 实验 | 最少做什么 | 什么结果会否定这条方向 |
|---|---|---|
| **B1：三维修扣件，优先** | 一枚精确月牙、一组扣座、三枚零件、一只支撑爪子；完成 30–60 秒含一次错误的装配。用同一素材做平面连续动画与三维版本比较 | 三维厚度/遮挡没有改善物体识别，玩家仍靠文字知道成败，或材质明显破坏插画统一性；此时停止扩建模型库 |
| **A1：一个空间角落** | 用去除角色与操作物的柜台图/粗布局生成一次小空间；导入低分辨率 SPZ + collider + 独立胸针。只许前后左右小范围探身、拿起并放回胸针 | 允许的视角内窗/柜台明显拉破；移走胸针后仍有残影；人物无法正确遮挡；生成资产需大量手补才能比现有画面更好 |
| **A2：真实手机负担** | 同一场景 100k / 500k splat 两档，明确一台 iPhone 和一台 Android；连续把玩三分钟，记录冷加载、平均/尾部帧时间与失去 WebGL context 情况 | 在约定测试网络下 8 秒仍不能操作，频繁低于 30fps、连续卡顿超过 100ms，或退出后台恢复失败。指标是本作目标，不是 Spark 广告承诺 |
| **C1：收藏盒形式** | 三个空间面、两件可拿物、一次打开/归位；最多一段角色表演。邀请不了解项目的人自由体验 | 没有作者说明就不知哪些层可打开；旋转成了找按钮负担；不能说出物品放在哪里。则缩为定镜修理台 |

**当前已证实与尚未证实：** Spark 官方 [Hello World](https://sparkjs.dev/examples/hello-world/index.html) 的 SPZ 蝴蝶已在本机渲染，1100×720，无 pageerror/requestfailed，截图 `spark-hello.png`。官方推荐的完整酒馆尝试加载后，首张截图超过 Playwright 30 秒限制，后续物理操作没有执行；因此只记录“复杂样例本机未验证通过”，不由此判断真实 GPU/手机不行。局部 GLB 翻面探针已通过。Marble 生成质量、图生三维质量、目标手机与完整装配均仍未实测。

## 6. 制作建议

先做 B1，它直接针对当前最薄弱的动作因果，而且已有本机 GLB 基础证据。同时准备 A1 的干净柜台输入与允许相机范围，等具备账号/额度后比较一小块生成空间；不要为了等待大模型算力停下能够检验的动作制作。若 A1 能维持画面质量并显著增加探索感，再选可探索房间或微缩收藏盒。

这次研究足以改变此前“固定插画 + 弹窗即可”的默认边界：可下载三维空间、可重新照明的图生资产、网页混合渲染与物理已经能组成新的制作方式。与此同时，**真正应被验收的是新增的空间行为和物件行为**：玩家能绕到哪里、看见什么原来被遮住的细节、手里的同一件东西如何变好。技术路线以这些结果决定去留。

## 7. 原生桌面候选：Godot 4 + GLB，作为完整微缩剧场的交付底座

**在允许我们包装安装与运行环境后，推荐把 Godot 4 + GDScript + GLB 作为下一版完整作品的首选制作底座。** Three.js 胸针观察器继续负责快速审样；成品可以是 Windows 可执行包、macOS 应用或 Linux 包。推荐理由是物件、角色表演、镜头、空间声音和交付能在同一个场景工程内组织，而非因为“用了游戏引擎就会精美”。本轮核查了官方文档，尚未制作或验收本作原生包。

### 生成三维与运行三维是两个阶段

Marble/TRELLIS.2 在制作阶段生成资产；24GB NVIDIA 等条件属于运行模型的制作设备要求。整理好的 mesh、纹理与动画进入 Godot 后，最终玩家运行的是普通实时三维作品，不必安装模型、CUDA、Python、Blender 或 Godot 编辑器。播放器的实际最低配置取决于最终几何、贴图、灯光和后处理，需要单独测量；不能由生成设备的要求推算，也不能由 190KB 胸针探针推算整部作品。

### 对这件作品的具体收益

| 制作环节 | 官方能力与本作的用法 | 仍要承担的制作判断 |
|---|---|---|
| GLB 与部件结构 | Godot 推荐 glTF 2.0，支持 `.glb`，会转成可用的场景；适合保留 `moon_body`、针、扣件等命名节点，并继续编辑父子关系。[导入文档](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_3d_scenes/available_formats.html) | 检查尺度、法线、轴心、命名与重导入设置。导入一个整块 mesh 不会自动把针分出来 |
| 材质与照明 | StandardMaterial3D / ORMMaterial3D 提供金属、粗糙度等材质参数，可把旧银、布、木头置于同一照明条件。[材质文档](https://docs.godotengine.org/en/stable/tutorials/3d/standard_material_3d.html) | 生成贴图中已有的光影须处理；金属反射、透明石头与绘画质感需人工统一，导入不保证画面与原图相同 |
| 骨骼与角色 | Skeleton3D 管理骨架、姿态与动画；为狐狸、小狗的爪子和视线制作少量可复用姿态，托物时让物体依附正确节点。[Skeleton3D](https://docs.godotengine.org/en/stable/classes/class_skeleton3d.html) | 要有合适拓扑、蒙皮和动作素材；图生角色不会自动获得可演出的骨架 |
| 动画状态 | AnimationTree 与 AnimationNodeStateMachine 可编排状态和过渡；把等待、扶稳、受阻、换件、确认接成有触发原因的表演。[动画树](https://docs.godotengine.org/en/stable/classes/class_animationtree.html)、[状态机](https://docs.godotengine.org/en/stable/classes/class_animationnodestatemachine.html) | 仍要做关键姿态、停顿、切换条件与接触点。核心装配用可控规则，不让精密物理决定成功 |
| 物理与触发 | StaticBody / RigidBody / Area 等能分别承担柜台、可掉落道具和检测区域；为针和扣座使用简单代理体。[物理介绍](https://docs.godotengine.org/en/stable/tutorials/physics/physics_introduction.html) | 渲染网格与碰撞网格分开；需要防穿透、抓取约束与合理容差 |
| 镜头 | Camera3D 提供透视/正交、视场与投影控制；能在柜台全景、同物体近景、微缩盒观察之间移动。[Camera3D](https://docs.godotengine.org/en/stable/classes/class_camera3d.html) | 镜头路径、手势范围和构图仍需导演；自由视角要保证不会暴露未制作的背面 |
| 音频 | AudioStreamPlayer3D 可让扣件声、脚步与柜内声来自空间位置；音频总线可分组、调音量与效果。[空间播放器](https://docs.godotengine.org/en/stable/classes/class_audiostreamplayer3d.html)、[音频总线](https://docs.godotengine.org/en/stable/tutorials/audio/audio_buses.html) | 音源、混音、循环与“咔哒”时点仍需试听；不因引擎具有混响就给每个声音加效果 |

### 交付方式与实际风险

Windows/Linux 官方导出系统把项目资源打入 PCK，并配专用运行程序；接收者无需打开编辑器。我们应交付明确版本、启动入口、已配置的画质/音量、保存路径与原始资产归档。先做 Windows x86_64 包作主验收对象，按实际接收设备补 macOS/Linux；平台顺序是当前制作建议，不是已确认用户设备。[Windows 导出](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_windows.html)、[Linux 导出](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_linux.html)

以 Forward+ 制作和检验桌面主画面，它能使用比 Web Compatibility 更完整的桌面渲染功能；再视目标设备准备低配预设。官方指出不同渲染器可能需要调整灯光与环境，因此不能把自动回退当作画面等价保证。桌面包装放宽了载入、文件与图形 API 的限制，但显存、发热、分辨率和驱动仍是实际预算。[渲染器对照](https://docs.godotengine.org/en/stable/tutorials/rendering/renderers.html)

原生还需要发布层面的制作：Windows 的签名证书、macOS 的签名/公证会影响首次打开体验。官方提供相应导出配置，macOS 可用 Apple Developer ID 与公证流程；这些应算进正式交付工作，而不是把配置任务留给接收者。当前没有购买证书或声称包已签名。[Windows 签名](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_windows.html#code-signing)、[macOS 导出](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_macos.html)

**生成空间进入原生的特殊边界：** Spark 是 Three.js 渲染器，不能直接当 Godot 内置能力。如果最终选择大量 SPZ 场景，需先验证原生 splat 插件的排序、深度遮挡、资产许可与目标显卡；本轮尚未核查出一套可直接承诺交付的 Godot splat 方案。因此 Godot 首轮底座围绕 GLB、分层画面与独立可操作道具建立；Marble 的高质量 mesh 可作为候选输入，须经历减面与材质整理。若 splat 视觉成为不可替代的核心，再依据原生插件实测比较其他引擎，而不是把所有路线先压成网页。

**下一次原生验收应是一份真的能启动的修理台包：** 一个全景到近景的连续镜头、一枚可翻胸针、一只会托住它的爪子、一次错误件受阻与一次正确合针、与动作同步的声音，以及退出后恢复位置。它把引擎能力、生成资产与艺术制作连在同一次可观察体验里。
