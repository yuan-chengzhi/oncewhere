# 原生样段纸偶资产：制作与接入记录

日期：2026-09-21。范围是无人物背景与两位值班员的可切片纸偶资产；本文件不声称完成 Godot 骨骼绑定、灯的抓握动画或原生样段验收。

## 实际交付

| 文件 | 内容 | 尺寸／通道 |
|---|---|---|
| [office-background.png](assets/art/office-background.png) | 无人物拾遗司背景；旧木抽屉、月洞窗、月光和左侧小灯保留，前景桌台移除，下半部简化为暗木护墙 | 1586×992，RGB |
| [fox-puppet-atlas.png](assets/art/fox-puppet-atlas.png) | 狐狸的头、无臂躯干、两片上臂、两片前臂连爪 | 1536×1024，RGBA |
| [dog-puppet-atlas.png](assets/art/dog-puppet-atlas.png) | 小狗的同制式六分件 | 1536×1024，RGBA |
| [atlas.json](assets/art/atlas.json) | 精确矩形、轴心、肩／肘／腕／掌心、相对缩放与镜像约定 | 像素坐标 |
| [assembly-preview.html](assets/art/assembly-preview.html) | 原图切片叠加预览，可拖动手臂、切换背景、显示接点 | 浏览器审样页，不是成品运行入口 |
| [assembly-rest.png](assets/art/assembly-rest.png)、[assembly-reach.png](assets/art/assembly-reach.png) | Chromium 实际拼装页面截图，分别检查静止与转臂姿态 | 审样证据 |
| [verification.json](assets/art/verification.json) | PNG 通道、alpha 统计、每片包围盒与 SHA-256 | 只读像素检查结果 |

三张选用 PNG 都是内置 `image_gen` 的实际输出，没有用 Python 编辑、抠图、重新绘制或改写透明通道。Pillow 仅用于读取通道、统计像素及检查切片范围；拼装页用 Canvas 的原图切片显示，截图记录渲染结果。没有调用独立生图 API。

## 接入约定

所有 `rect` 为 `[x, y, width, height]`；所有轴心与接点均为**原图绝对像素坐标**，原点在左上，Y 向下。切到 AtlasTexture 后，本地接点等于绝对坐标减去 `rect` 左上角。不要直接按 512×512 网格切：头部边缘略跨名义格线。

| 角色／部件 | 矩形 | 轴心 | 相对躯干缩放 |
|---|---|---|---|
| 狐狸头 | 102, 8, 427, 508 | 310, 463 | 1.00 |
| 狐狸躯干 | 582, 36, 434, 481 | 799, 300 | 1.00 |
| 狐狸左上臂 | 1170, 65, 227, 434 | 1246, 123 | 0.55 |
| 狐狸右上臂 | 177, 535, 244, 426 | 296, 582 | 0.55 |
| 狐狸左前臂 | 671, 532, 301, 443 | 766, 579 | 0.55 |
| 狐狸右前臂 | 1077, 534, 293, 454 | 1268, 582 | 0.55 |
| 小狗头 | 78, 39, 465, 451 | 313, 445 | 1.00 |
| 小狗躯干 | 618, 14, 420, 505 | 826, 300 | 1.00 |
| 小狗左上臂 | 1187, 63, 246, 421 | 1290, 121 | 0.55 |
| 小狗右上臂 | 148, 537, 243, 440 | 279, 586 | 0.55 |
| 小狗左前臂 | 660, 524, 337, 464 | 764, 573 | 0.55 |
| 小狗右前臂 | 1093, 524, 296, 471 | 1265, 574 | 0.55 |

这里的左右指**原图未镜像时的舞台左右**，不声称是解剖学左右。两张生成头像都朝原图右侧；狐狸放舞台左边，小狗整组水平镜像后放舞台右边，两人就朝向共同桌面。镜像须同时作用于头、躯干、手臂及所有接点，不能只翻头像。小狗没有文字，镜像不会反转可读信息。

生成器没有严格遵循部件等比例要求，手臂片偏大。表中 0.55 是在实际拼装预览中采用的缩放，指相对躯干的绝对比例；如果 forearm 已经继承 upper 的 0.55，不能再次乘 0.55。头与躯干的 neck 接点相连，上臂 shoulder 连躯干 shoulder，前臂 elbow 连上臂 elbow；其余 wrist、palm 与 fingertip 坐标见 JSON，便于手与三维灯／月牙接触。

已验证的绘制次序是：上臂在躯干后；躯干；头在躯干前；前臂在躯干前。**头必须压住领口**，否则会看见原本用于连接的领口顶面。实际原生接触动作还需调整每只手的前后层级，不能让灯和爪永远共用同一个覆盖顺序。

建议角色材质丢弃 alpha 小于约 0.07 的像素，消除原图背景里极淡的残留；保留原始 PNG。精确阈值需看 Godot 目标分辨率边缘，不应套用会明显切掉纸边的高阈值。背景本身不透明。

## 制作与检查事实

先查看并沿用 [office-reference.png](assets/art/sources/office-reference.png) 与 [market-reference.png](assets/art/sources/market-reference.png) 的身份、服装和气氛。狐狸保留橙红尖耳、白色脸颊、花枝发饰、米白衬衫、深棕刺绣马甲与铁锈红裙腰；小狗保留浅金垂耳、米白衬衫、深青领带／马甲与细表链。表面改为平面纸材与水粉笔触，毛发以分组笔触表现；仍有一定绘画毛发细节，没有宣称完全成为真实纸雕摄影。

首轮图集的肩、领口、肘端带浅米色的空心椭圆。浏览器拼装时发现这些轮廓显得像拆开的衣服，于是各进行一次局部生图补画，把空心顶面改为布面／浅色毛面，保留各部件位置。最终图仍有纸片搭接轮廓，作为纸偶接缝保留；不应描述为无缝三维皮肤。

最终 alpha 检查：

- 狐狸有 1,066,812 个完全透明像素，31,336 个 alpha 1–16 的低透明残留像素；alpha 范围 0–254。
- 小狗有 1,006,325 个完全透明像素，27,233 个 alpha 1–16 的低透明残留像素；alpha 范围 0–254。
- 两张图所有 alpha 大于 16 的可见像素全部被六个指定矩形包含，矩形外遗漏数均为 0。每片周围有数像素以上透明余量。
- 实际查看原图及两次拼装截图：未见文字、水印、额外角色、书本或混入的道具。头、躯干、上臂、前臂互不粘连；背景中无角色，台前留白可容纳原生桌台。
- 生图工具与普通 `view_image` 的展示可能显露 RGB 底色，即使对应 alpha 为 0；应以实际 alpha 统计和浏览器透明叠加效果判断，不能仅凭该工具预览认定背景不透明。

当前只有一组静态眼神和一对静态弯爪，尚无眨眼、嘴型、手指开合、前后双面、侧脸替换或真实体积。已验证每只头和手臂能在预览中独立旋转；没有将这称为完成骨骼绑定或自然抓握表演。大幅镜头侧移会暴露二维纸片性质，适合这次固定／小幅运动的微缩舞台。

## 工具输入与原图留存

本轮共调用内置 imagegen 五次：背景一次、狐狸一次、小狗一次、接点补画两次。最终三个工作文件保留内置输出的原始 PNG；补画前两张图集保存在 `sources/`。该目录有 `.gdignore`，避免 Godot 把制作参考重复导入。

| 调用 | 完整 prompt | 原始工具输出文件名 |
|---|---|---|
| 背景 | [office-background.txt](assets/art/prompts/office-background.txt) | exec-9f6b6f54-04e0-4eb0-b2f7-688080a13269.png |
| 狐狸初稿 | [fox-puppet-atlas.txt](assets/art/prompts/fox-puppet-atlas.txt) | exec-48b0488e-3d33-41a7-9dd7-8b8920fe5c5a.png |
| 小狗初稿 | [dog-puppet-atlas.txt](assets/art/prompts/dog-puppet-atlas.txt) | exec-176f0192-9c3b-406d-b97f-09b93bde0ade.png |
| 狐狸接点补画 | [joint-cloth-repair.txt](assets/art/prompts/joint-cloth-repair.txt) | exec-b67c7424-62cf-43d5-819f-86044677363c.png |
| 小狗接点补画 | [joint-cloth-repair.txt](assets/art/prompts/joint-cloth-repair.txt) | exec-548fb7b8-d7c7-48e9-b02b-381c78d22145.png |

内置原始输出目录为 `/home/ubuntu/.codex/generated_images/01a0c3ca-78a2-7ec1-8c3b-550e04400c98/`。工程不依赖该目录，所有选用文件及参考已复制到本工程目录内。狐狸／小狗补画前原图分别为 [fox-puppet-atlas-v1.png](assets/art/sources/fox-puppet-atlas-v1.png)、[dog-puppet-atlas-v1.png](assets/art/sources/dog-puppet-atlas-v1.png)。
