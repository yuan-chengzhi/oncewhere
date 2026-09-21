# 可控角色与素材制作路线研究

核查日期：2026-09-21。对应[美术对照评审](art-benchmark.md)中“人物需要表演、道具需要接触、资产需要可局部修改”的问题。用户已明确不必交付 HTML，可以下载、配置和包装桌面程序；以下不以浏览器为制作上限。

**建议先比较两种会改变作品形式的样段：分层角色的可操纵小剧场，以及由表演视频驱动的互动短片。** 若希望玩家从不同位置观察柜子、实际拿起物件，再考虑第三条：经修整的三维角色与布景。最新模型确实扩大了可行范围，但“生成一段好看的动作”与“得到可以持续编辑、交互和闭合的角色资产”仍是不同能力。

本轮完成了官方代码、模型树、许可与演示核查；没有运行模型推理，没有声称已经解决本作狐狸、小狗的动作。把证据分为 **官方功能说明、实际核查、制作推论、待做实验**。没有从论文总分推算本作美术质量。

## 先区分三个阶段

| 阶段 | 需要什么 | 与最终交付的关系 |
|---|---|---|
| 创作期模型推理 | 本地／租用 GPU，或有凭据的生成服务；得到图片、图层、视频、网格 | 可以由制作方完成。用户无需安装 Python、下载模型或拥有同等 GPU |
| 编辑与整合 | Spine／Blender／Godot／Unity 等编辑器，修图、绑定、关键帧、镜头、声音与事件 | 模型输出通常只是中间资产，需要在此阶段变成可控的作品 |
| 用户端运行 | 打包后的程序与资产，或预渲染影片片段；实际要求由渲染方式决定 | 可以离线。不能用“模型推理需要多张 A800”推断“用户也需要多张 A800” |

**本环境实际核查：** 没有发现 `nvidia-smi` 或 `/dev/nvidia*`；当前系统 Python 没有 torch／diffusers，命令路径未发现 Blender 或 FFmpeg。本地 Chromium 实测可建立 Canvas2D 和 WebGL2 上下文，未获得 WebGPU。本轮已用它查看本作画面，以及解码官方 MP4 并抽取指定时间截图。这证明了部分资产检查能力，不等于完成角色绑定、推理或桌面打包。安装依赖可改变软件条件；GPU 推理可以移到另一台机器或服务，不构成放弃路线的理由。

## A：透明图层与参考图编辑，接入可精确控制的二维角色

**改变上限的地方：** 从“每次生成一张完整场景”变成“同一位角色有可独立修改的身体、表情、手和道具”。角色能看向玩家刚摸过的标签、在等待时停住、接过灯后继续工作。其价值来自局部资产和动作控制，不是让整张背景摇晃。

官方已有两类不同能力，不能混写：

| 工具 | 已核实的能力与可获得物 | 关键边界与许可 |
|---|---|---|
| [Qwen-Image-Layered](https://github.com/QwenLM/Qwen-Image-Layered) | 2025-12 发布；图像分解为多张 RGBA；官方应用提供 PSD／ZIP／PPTX 导出，可递归分解。公开[模型权重](https://huggingface.co/Qwen/Qwen-Image-Layered)，Apache 2.0 | 官方明确：文字描述整体内容，不用于直接指定每一层的语义。不能承诺一句“按肘、腕、指分层”就得到可绑定角色；遮住的身体仍需修补。分解时也可能重构图像 |
| [Qwen-Image-2.1](https://github.com/QwenLM/Qwen-Image-2.1) | **2026-09-20 新发布**；官方提供原生 RGBA 生成／编辑、最多十张参考图、圈画或遮罩指示局部编辑；[权重确已公开](https://huggingface.co/Qwen/Qwen-Image-2.1) | [Qwen Research License](https://github.com/QwenLM/Qwen-Image-2.1/blob/main/LICENSE) 只授权研究／评估的非商业用途；商业用途需另获许可。不要把“私人赠礼”自动等同研究，也不要沿用旧版 Apache 印象。角色一致性是模型目标，未证明本作多姿势严格不漂移 |
| [Qwen-Image-Edit-2511](https://huggingface.co/Qwen/Qwen-Image-Edit-2511) | 公开多参考图编辑权重；官方示例与模型卡提供角色一致性编辑，许可 Apache 2.0 | 可作为正式生产候选；不把它写成 2.1 那样的原生透明生成器。多参考图不会自动产生固定拓扑、骨骼或视角间精确对应 |

**实际核查：** 通过 Hugging Face 官方 API 查询，上述 Layered 与 2.1 模型均非 gated，列有实质权重文件；相应文件下载地址返回带文件大小的下载重定向。不是只有发布帖。本轮还下载并查看 [fal 官方 Layered API](https://fal.ai/models/fal-ai/qwen-image-layered/api) 的输入与四张示例输出：示例将“台灯＋椅子”合在一层、“桌子＋花瓶”合在一层，说明多层不等于逐对象独立，更不等于逐关节独立。PNG 文件头与浏览器 alpha 读取确认输出具有透明通道；示例输入为 1024×768，输出为 736×544，也不能假定无损保留原图尺寸。这是服务方提供的示例，不是本作推理结果。

**一个会影响实际选型的依赖细节：** Layered 仓库的 [`edit_rgba_image.py`](https://github.com/QwenLM/Qwen-Image-Layered/blob/main/src/tool/edit_rgba_image.py) 是“垫绿底 → Qwen-Image-Edit-2509 → RMBG-2.0 抠图”，不是原生透明编辑。其依赖 [BRIA RMBG-2.0](https://huggingface.co/briaai/RMBG-2.0) 的自托管权重需遵守非商业许可，商业使用需相应协议／服务授权。主仓库 Apache 2.0 不会自动覆盖这项外部模型。正式流水线可以只使用 Layered 分解，随后手工编辑图层／保留遮罩；不要直接把演示脚本整体当作许可已统一的商用方案。

**怎样接成可控动作：** 先做一名角色的干净正侧倾姿态，整理头、耳、上臂、前臂、手、躯干、前后衣片与必要遮挡补片；不同抓握手型可用切换绘片。脸的身份和袖口细节固定为母稿，修姿势时尽量只修改相应图层。为胸针建立唯一对象，在“狐狸持有／两人接触／小狗持有／放入柜中”之间明确切换父节点与接触目标；用骨骼、网格、关键帧组织身体动作。这样循环和动作终点可以由程序／编辑器控制，材质也能一直沿用原图。

| 制作与运行选择 | 可控性及导出 | 本作取舍 |
|---|---|---|
| **Spine → Godot／Unity** | 骨骼、蒙皮、[一／两骨 IK](https://en.esotericsoftware.com/spine-ik-constraints)；可在运行时把手指向目标。导出骨骼／动画数据、atlas、PNG；[官方 Godot 运行时](https://us.esotericsoftware.com/spine-godot)可接 AnimationPlayer 和骨骼跟随节点 | 是成熟的角色制作工具，但要自己设计骨骼、权重、姿势和时序。IK 不在 Essential 内；[运行时许可](https://en.esotericsoftware.com/spine-runtimes-license)与编辑器许可关联，不能当作 MIT 库直接嵌入 |
| **Godot 自带二维骨骼** | [Skeleton2D／Bone2D 与 Polygon2D 权重](https://docs.godotengine.org/en/stable/tutorials/animation/2d_skeletons.html)，角色和道具保持可编辑，可打包为桌面场景 | 适合范围小、固定镜头的纸偶／布偶剧场。最少先做少量关节，精细手型采用绘片，不必先开发通用动画编辑器 |
| **Unity 2D Animation** | 官方 [2D Animation 13.x](https://docs.unity3d.com/Packages/com.unity.2d.animation@13.0/manual/index.html)对应 Unity 6000.3；[PSD Importer 样例](https://docs.unity3d.com/Packages/com.unity.2d.animation@13.0/manual/ex-psd-importer.html)将 PSB 图层变为 Sprites，再用 Skinning Editor／SpriteSkin 与 Animator | 同样可做原生桌面作品。不要承诺任意 PSD 导出文件无需整理就自动绑好；角色分层和变形修正仍需制作 |
| **Live2D Cubism** | 可用参数控制绘制的变形与表情，导出[模型、纹理和 motion3 数据](https://docs.live2d.com/en/cubism-editor-manual/export-moc3-motion3-files/) | 适合表情和头肩微动作；双人递物仍需额外设计。SDK 与编辑器的许可分开，[SDK 发布条件](https://www.live2d.com/en/sdk/license/)有个人／小企业例外及特殊应用边界，不能笼统写成永久免费 |
| **PixiJS 自定义网格** | [MeshSimple／MeshPlane](https://pixijs.com/8.x/guides/components/scene-objects/mesh)可修改顶点；[MIT](https://github.com/pixijs/pixijs/blob/dev/LICENSE) | 仍可保留为网页候选，但它是渲染基础，不自带完整角色绑定编辑器。既然桌面交付已开放，就没有必要为了延续 HTML 而自行重造复杂骨骼工具 |

**循环与局部修改：** 图层、骨骼和对象状态固定后，可以编辑单个关节、只重画一只手，并对首尾参数施加相同值。闭合的是参数，不自动保证姿态自然；转身幅度超过绘制信息时仍需替换绘片。不能靠把手臂网格大幅拉长来补足未画出的身体。

**可获得的服务：** fal 已有明确的 `fal-ai/qwen-image-layered` API，接收 `image_url`、`num_layers` 等，返回 PNG／WebP 图层链接；需要 API key。这提供了不依赖本机 GPU 的实验入口。本轮没有提交请求、产生费用或核实账号额度。Qwen 官方也提供 [Layered Space](https://huggingface.co/spaces/Qwen/Qwen-Image-Layered)与[2.1 Space](https://huggingface.co/spaces/Qwen/Qwen-Image-2.1)，公开演示页不等于已验收的生产 API。

**最小可证伪实验 A：** 只做“小狗放下簿、接过狐狸递来的灯、照标签、把灯放回”八秒。输入固定角色母稿、一盏固定灯与一件固定标签，整理所需透明层；在 Godot 或 Spine 中做成能暂停、继续、在接触之前取消的动作。检查：改一只袖口是否牵连脸与另一人；手臂转动是否露洞；两只手共同接触时灯是否滑动；完成后停十秒是否仍稳；循环待机二十次是否出现跳变。黑、白、深青三种背景检查毛边。若大量部位仍需逐帧重画，就缩小转身幅度或转向完整重绘，不把“已有透明层”判定为绑定成功。美术验收另用无对白观看，判断动作是否读得懂。

## B：参考图＋表演视频，生成短镜头，再按镜头组织交互

**最新可核实路线是 [Wan-Animate-2](https://github.com/Wan-Video/Wan-Animate-2)，不是把 2025 年 Wan2.2-Animate 重新称作前沿。** [原始论文](https://arxiv.org/abs/2608.06009)发表于 2026-08-06；官方仓库记录 08-07 发布推理脚本、Base 与 Distillation。已核查 [Wan-AI/Wan2.2-Animate-2-14B](https://huggingface.co/Wan-AI/Wan2.2-Animate-2-14B) 模型树中存在两个核心 safetensors 文件，模型卡与代码标 Apache 2.0；另有公开的 [Distilled Diffusers 权重](https://huggingface.co/Wan-AI/Wan2.2-Animate-2-14B-Distilled-Diffusers)。

**官方说明：** 输入角色参考图和驱动视频，直接从视频条件迁移动作；论文还研究机位控制和流式 Lite 版本。**实际可执行边界：** 已读的[推理入口](https://github.com/Wan-Video/Wan-Animate-2/blob/main/infer/wan_animate_2_demo.py)接收参考图、视频、尺寸、帧数、步数、随机种子等，输出 MP4；没有看到原生透明视频、明确末帧约束或“无缝循环”开关。不能把这里的 MP4 写成骨骼、独立手部图层或可交互三维角色。

**硬件与发布范围：** 仓库默认配置面向八张 A800 的 720P，并称测试过两张 A800 的 480P；这不是已证明的最低配置。论文 Lite 的实时结果是在四张 H100 上、400×720、24fps；本轮公开下载与入口只确认 Base／Distillation，没有确认同等可部署的 Lite 流式产品。不要把下载版“蒸馏”自动等同论文三步 Lite，也不要把论文吞吐率当用户设备实时响应。生成发生在创作期后，用户端只需播放整理好的资产。

**实际看了演示的哪些部分：** 下载[官方项目页](https://humanaigc.github.io/wan-animate-2/)的两段 MP4，用 Chromium 分别定位 0.5、2、4 秒并用 `view_image` 查看截图。一个演示用叼花小狗驱动叼花猫，另一个把两人动作迁到紫裙／黄裙的两只拟人猫。所看静帧中能辨认步态、手势与双角色位置的变化，服装主色仍在；它们是明显超过背景漂移的表演素材。**但本轮没有连续视觉播放体验、没有听音频，没有把三帧抽查称为流畅度、微小手部或长期身份一致性的验收。** 也没有证据表明官方展示了本作需要的“把小扣件精确扣入座中”。

**我的制作推论：** 这条路线适合把作品改成“可以停留和选择的短片”：几秒钟有细腻身体动作的镜头，接一个可等待的稳定镜头，再由用户触发下一段。驱动表演可以先由制作方拍摄，或用粗略三维角色排好动作；生成负责把动作迁成狐狸／小狗的画面。为了可修改，可把背景、表演片段、关键谜题物件分别保管，但关键物件最好保持为确定的图层／三维对象，别让同一颗星星每一帧重新猜一次形状。

视频需要透明合成时，[SAM 3.1](https://github.com/facebookresearch/sam3/blob/main/RELEASE_SAM3p1.md)可作为跟踪与分割的候选；它于 2026-03-27 发布改进的多对象跟踪，公开代码和模型入口。但分割遮罩不等于完美毛发 alpha，也不恢复被手遮住的背景。其[模型使用](https://github.com/facebookresearch/sam3)有申请／认证步骤，使用[独立 SAM License](https://github.com/facebookresearch/sam3/blob/main/LICENSE)，不能从包装代码的 MIT 标记推断模型同为 MIT。透明输出的毛边、运动模糊、投影和交叉遮挡，必须在合成时逐项检查。它本身不解决动作闭合。

闭合有两种不同需求：待机循环要求首尾姿态、亮度和速度相接；一次递物动作要求终点与下一镜头／存档状态相同。相同参考图、同一随机种子、把视频倒放，均不能自动满足二者。对于递物，可优先使用稳定的停留镜头衔接；若连停留画面都明显换脸、换物件，就不适合作为当前作品的连续镜头资产。

**最小可证伪实验 B：** 固定镜头录制与 A 相同的八秒“放下簿、接灯、照标签、放回”，用同一人物参考生成三次，保存所有结果而非只挑最好的一条。再把其中一条放入临时原生场景，按“等待 → 点击 → 动作 → 等待”播放。检查三次是否都保留耳形、服饰和手中的同一盏灯；每隔若干帧检查手与灯接触、两人是否交换身份、灯是否多生；对最终合成逐帧查遮罩边缘，连续重复二十次找接缝。若只有一次好看但不能修某只手、不能稳定回到等待姿态，就将它定位为一次性的插入镜头，不据此推翻整套交互结构。

**当前可调用性：** 官方提供自托管脚本与 ModelScope 演示入口，尚未在本环境完成推理。已查到的 [fal Wan2.2 Animate Move API](https://fal.ai/models/fal-ai/wan/v2.2-14b/animate/move/api)写的是旧 Wan-Animate，不能把这个 endpoint 冒充 Wan-Animate-2。需要部署新版或另核实确实提供新版的服务；这项差别会影响实验结果。

## C：三维角色自动初绑，再用 Blender 修整，进入原生小剧场

这是另一个真正改变形式的候选，适合“看得见柜子厚度、角色可以绕到身侧、道具可以从任意角度拿起”的作品。它不要求复制现有图的写实毛发；可以重新设计成简洁的木偶、纸塑或陶偶，让几何和材料一起可控。

[UniRig 原始仓库](https://github.com/VAST-AI-Research/UniRig)提供骨架预测、蒙皮预测，以及与原网格合并的工作流，接受 OBJ／FBX／GLB／VRM，示例导出 FBX／GLB；[代码许可](https://github.com/VAST-AI-Research/UniRig/blob/main/LICENSE)为 MIT，[模型卡](https://huggingface.co/VAST-AI/UniRig)也标 MIT，本轮核实公开树中有骨架与蒙皮 checkpoint。官方生成要求列 CUDA GPU、至少 8GB VRAM。它的输入是三维模型，不能从本作二维插画直接得到可用绑定；也不要把其训练章节的显存要求当作推理要求。

自动骨架能减少初始体力工作，仍需检查肩肘权重、裙摆、尾巴、耳朵、手指／爪、面部形变和接触。尤其是递扣件：骨架拓扑正确不等于手能正确握住小物件，手、扣件和柜面之间还需要动画约束与修形。

**可交付资产：** 保管 Blender 源文件、纹理、骨骼与烘焙后的动画，导出 GLB／FBX 进入 Godot／Unity；[Godot 官方导入说明](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_3d_scenes/available_formats.html)推荐 glTF，也支持 FBX。用户运行打包的程序，不需要安装 Blender 或 UniRig。Blender 自身的 [GPL 许可不把创作出的 .blend、图片和影片一并强制为 GPL](https://www.blender.org/about/license/)；输入角色、纹理和模型权重的许可仍各自保留。不要因选原生交付就引入实时生成依赖。

**最小可证伪实验 C：** 先用本作重新设计的一位低复杂度小狗三维模型，自动初绑后只做“弯腰拿灯、转身、放在案上”三个动作，检查一前一侧两个机位。记录需要手修的骨骼与权重，检查袖口穿插、爪与灯的接触及尾巴是否穿椅；把烘焙结果导入一个桌面样场景，拖动灯的位置，检查角色是否还能可信地够到它。若自动初绑后仍几乎要重做全身，就只保留可用部分，不能宣传为自动得到可用角色。原生端帧率和最低配置须用这个样场景实测，与模型推理配置分开记录。

## 该怎样选择

| 想获得的体验 | 首选路线 | 当前最值得验证的未知 |
|---|---|---|
| 玩家摸东西时，两位值班员持续回应、等待、递接 | A；Spine／Godot／Unity 的可编辑二维角色 | 分层准备与关节补画能否在有限动作范围内达到美术标准 |
| 更强的身体表演、镜头和短片节奏，交互发生在段落间 | B；离线制作表演视频，原生程序组织段落 | 身份、握物、透明合成和接缝能否稳定，而非只有单条漂亮演示 |
| 可以靠近柜台、换角度看、拿起摆放物件的微缩场景 | C；Blender 修绑与动画，Godot／Unity 运行 | 角色雕塑与手工修正工作量、材质统一和实际设备表现 |

**我倾向先做 A 的角色样段，同时用完全相同的一次举灯动作对照 B。** 两者都允许推翻目前的整幅插画制作方式。若 B 在表演上显著更好而局部操作不能成立，就接受作品转向互动短片；若拿起物件和空间距离变得重要，再让 C 竞争。不要预先保护现有 HTML 架构，也不要预先把“用了最新模型”当成胜出条件。验收的是动作、关系、材料与可修改性。

## 可复查的技术证据

本轮只访问原作者／模型组织的仓库、模型卡、原论文、编辑器官方文档，以及 API 服务商自己的接口文档。没有以第三方排行、转述或宣传视频点赞数作为能力证据。

| 已核查模型 | Hugging Face 当时 revision | 核查范围 |
|---|---|---|
| Qwen-Image-2.1 | `790c92633540aa0cb11d9abf19eb46d861714758` | 非 gated；7 个权重文件；研究许可 |
| Qwen-Image-Layered | `8f0ca708dfff6ba1dd5f2d85d78f8c108a040bcf` | 非 gated；10 个权重文件；模型卡 Apache 2.0 |
| Wan2.2-Animate-2-14B | `6e8f1973bf0abc2aafd517992e8b6d88c3c46e69` | 非 gated；含 Base／Distillation 核心文件；模型卡 Apache 2.0 |
| Wan2.2-Animate-2-14B-Distilled-Diffusers | `59e4141466bcb1bf9733eca1bc78be6891c9fbdf` | 非 gated；Diffusers 权重目录；模型卡 Apache 2.0 |
| UniRig | `36842e2b5947e9e60f89275b83208c8e74071c63` | 非 gated；3 个 checkpoint；模型卡 MIT |

这些检查是模型清单与下载入口核验，不是完整下载校验，更不是本作输出质量验证。没有批量下载数十 GB 权重，也没有提交外部推理或上传本作资产。

临时查看资料均在 `/tmp/moon-office-art-benchmark/tech/`，没有进入项目发布资产：

- Wan 两段原演示完整地址：[动物动作迁移](https://humanaigc.github.io/wan-animate-2/content/单人/小狗.mp4)、[双拟人猫动作](https://humanaigc.github.io/wan-animate-2/content/多人/猫_多人舞蹈.mp4)。本地分别为 `wan-dog.mp4`、`wan-cats.mp4`；每段的 `-0.5.png`、`-2.png`、`-4.png` 是实际查看的截图。文件名“小狗”不表示输出主体是小狗：所看演示实际是小狗驱动猫。
- Layered 示例原链接均出自前文 fal 官方 API 文档：[输入](https://v3b.fal.media/files/b/0a86d421/6xSMYtyW-fm2ciM6dHEgB.png)、[层0](https://v3b.fal.media/files/b/0a86d42c/7T3zJKciQ1cCzqR3ADLif.png)、[层1](https://v3b.fal.media/files/b/0a86d42c/KVt5pIhe2dU-qZNC2Njo2.png)、[层2](https://v3b.fal.media/files/b/0a86d42c/3BMMGMaHyA3Y7Q_kamIJ_.png)、[层3](https://v3b.fal.media/files/b/0a86d42c/AY1BjZxhqS1jl-Pw2S1Tx.png)。本地为 `layered-input.png` 与 `layered-0.png` 至 `layered-3.png`。本轮文件实际可下载；不保证服务方临时链接以后一直有效。
- 原始 README、LICENSE 与 Wan 推理入口的临时文本快照用于核查。报告中涉及许可的决定均给出对应原文链接，没有将一项工具的许可扩大套用到整条生产链。
