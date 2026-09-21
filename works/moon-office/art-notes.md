# 美术制作记录

2026-09-21。制作方式：内置 `image_gen`，没有使用 CLI/API 回退。图像在生成后逐幅查看，比较角色、构图、叙事物件与文字留白；再转换成 WebP 用于网页。转换仅压缩格式，不用于生成、绘制或修改画面内容。

| 实际使用资产 | 内容 | 完整生成提示词 |
|---|---|---|
| [office.webp](public/art/office.webp) | 拾遗司柜台，开着的第七号柜、两位值班员、鸟笼 | [office-prompt.txt](assets/art-source/office-prompt.txt) |
| [station.webp](public/art/station.webp) | 长椅、错乱的钟、通向星空的候车室 | [station-prompt.txt](assets/art-source/station-prompt.txt) |
| [echo.webp](public/art/echo.webp) | 并肩坐着的两人、绕过山谷的星光 | [echo-prompt.txt](assets/art-source/echo-prompt.txt) |
| [market.webp](public/art/market.webp) | 首饰街、小星星与柜台上的修理盘 | [market-prompt.txt](assets/art-source/market-prompt.txt) |
| [ending-final.webp](public/art/ending-final.webp) | 回程三盏灯、留在衣领上的星星、空鸟笼和收好的抽屉 | [ending-prompt.txt](assets/art-source/ending-prompt.txt)、[ending-refinement-prompt.txt](assets/art-source/ending-refinement-prompt.txt) |

原始 PNG 在 [assets/art-source/](assets/art-source/)。后三个不同场景以及结尾均以本轮生成的 office 原图作为角色和画风参考。结尾首版误生成为四盏回路灯，经第二次图像编辑去掉多出的灯；采用的 `ending-refined.png` 已目视检查为三盏。第一次结尾版本保留作过程资料，不进入发布资源。

场景图均为 1586 × 992；实际尺寸以文件为准。源文件保留生成输出，WebP 使用质量 88、effort 6 压缩。背景是单幅插画，灯的微光、光尘、纸鸟、回声路径和可互动道具由独立代码层承担；当前没有声称角色本身已完成分层动画。

胸针、背面扣座、候选扣件、三张票据与两只纸鸟由 [objects.ts](src/objects.ts) 绘制成 SVG。这些几何需要与解谜规则精确一致。正式中文由 HTML 排版；生成背景中没有承载解谜的文字。

角色与材料基准：赤褐狐狸、素色衬衫、暗色背心与长裙；米白垂耳小狗、深青背心；旧木、素纸、氧化银、玻璃；局部暖光与深青夜色。参考材料来自本项目故事和前期研究，未把其他游戏截图输入生成工具。

本轮实际浏览器截图见 [assets/review/](assets/review/)，仅用于记录当前构图与交互呈现。生成场景本身不代表交互已经完成，也不能替代移动端的缩放、文字和触控检查。
