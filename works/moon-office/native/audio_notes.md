# 原生样段：响应音乐与物件声音

日期：2026-09-21。范围：修理、托住、真正扣合、递灯与软布安放。声音文件已离线制作；**当前环境无法主观聆听，未完成人工听感验收**。下列信号、脚本和播放检查不等于耳机、手机扬声器或审美验收。

## 音乐随动作阶段改变

沿用[《第七号柜》原有主题与来源](../audio-notes.md)，取[原谱](../assets/audio-source/score.json)第 1–8、25–32 小节，重配为共同的 46 秒时间轴。三个状态都包含这两句完整的八小节乐句，保留原有呼吸时序、D 大调和声与钢琴采样；仅改变音符保留与声部增益。

| 状态 / 文件 | 本次配器 | 建议阶段 | 音符事件 / 文件综合响度 |
|---|---|---|---|
| `observe` / [music-observe.ogg](assets/audio/music-observe.ogg) | 保留首尾短动机、低音与部分内声，中间给观察留空 | 看缺口、拿起物件 | 63 / −25.0 LUFS |
| `hold` / [music-hold.ogg](assets/audio/music-hold.ogg) | 隔小节低音、少量内声与两处单音；有接近安静的空隙 | 托住、试合、等另一只手 | 22 / −34.0 LUFS |
| `resolve` / [music-resolve.ogg](assets/audio/music-resolve.ogg) | 旋律回来，内声仍减配，后半句稍轻 | 实际合上后、接灯、归途 | 95 / −22.3 LUFS |

文件均为 44.1 kHz、双声道、Vorbis q6，时长精确 46 秒。响度为 FFmpeg EBU R128 的文件测量，应用另将音乐降低 3 dB。留白故意低于另外两态，没有把减配版重新归一到同样响度。

每态连续渲染三遍采样、踏板释放、滤波及混响，取中间完整一遍；前一轮尾音进入下一轮。没有用首尾硬切或每轮淡到静音来冒充音乐衔接。留白段有真正的无新音符空隙，接近静音的循环接缝是配器结果。

[NightSound](scripts/night_sound.gd) 用 `AudioStreamSynchronized` 让三段从同一采样帧开始并持续循环；设置状态只改变三段的混合增益，不回到乐曲开头。`hold` 1.8 秒、`observe` 2.4 秒、`resolve` 2.8 秒交叉淡入；曲线为两端斜率为零的 smoothstep，增益按线性幅度插值。共同音符有相关性，因此没有采用会抬高共同声部的等功率叠加。连续快速切换从当前三个增益继续，未完成的旧切换不会截断某一轨。

这种方式让配器立即开始响应阶段，同时保留当前乐句；完成动作不保证总落在主题第一音，也没有另外加入“过关旋律”。再次进入相同状态不重启音乐。关闭声音用 120 ms 斜坡到精确零增益，期间禁止新音效，音乐时间轴继续前进；重新开启不会从第一音重播。

## 材质与触发

音效均为本次确定性程序合成，**不是现场录音**。木抽屉沿用原有木质模态与摩擦模型重新渲染，其余按本次动作设计。没有按钮点击音、通关铃或持续噪声底。

| `play_cue` 名称 / 文件 | 声音设计与实际触发 | 时长 |
|---|---|---:|
| `pickup` / [pickup.wav](assets/audio/pickup.wav) | 轻微指腹摩擦与桌面离开接触；物件开始被拿起 | 0.42 s |
| `blocked` / [blocked.wav](assets/audio/blocked.wav) | 单次短而阻尼的接触；方向未合、轻触受阻 | 0.26 s |
| `clasp` / [clasp.wav](assets/audio/clasp.wav) | 同一次锁扣事件内的受压与弹簧落座；仅最终真正扣合 | 0.48 s |
| `cloth` / [cloth.wav](assets/audio/cloth.wav) | 低中频纤维摩擦与软接触，没有金属共振；放到软布 | 0.84 s |
| `drawer_open` / [drawer_open.wav](assets/audio/drawer_open.wav) | 木轨摩擦和不规则轻碰；木抽屉开始移出 | 1.18 s |
| `drawer_close` / [drawer_close.wav](assets/audio/drawer_close.wav) | 木轨摩擦和有阻尼的木止挡；木抽屉合拢 | 0.94 s |
| `lamp` / [lamp.wav](assets/audio/lamp.wav) | 提柄摩擦、很短的灯罩共振；灯确实被拿起／接走 | 0.75 s |

PCM WAV 均为 44.1 kHz、16 bit、双声道，首尾为零。应用将音效降低 1 dB；四个独立声音通道保留短尾，不抢占正在响的声音。同类限流 0.30–1.20 秒，阻止连点累积。`clasp` 的 1.20 秒防抖只防重复输入，**剧情仍负责只在实际锁定时调用一次**；选中正确扣件、确认按钮、后续安放都不应调用它。`lamp` 表示实体移动，单独亮起灯光无需发声。

## 接口

```gdscript
var sound := NightSound.new()
add_child(sound)
sound.set_state("observe")
sound.play_cue("pickup")
sound.set_state("hold")
sound.play_cue("blocked") # 只有实际轻碰受阻时
sound.play_cue("clasp")   # 只有实际锁定时，一次
sound.set_state("resolve")
sound.play_cue("lamp")
sound.play_cue("cloth")
sound.set_enabled(false)
```

`set_state` 和 `set_enabled` 可在节点加入场景前调用；默认启用，初始音乐缓慢淡入。声音开关不操作全局 Master 总线，便于场景自行决定保存设置。未知 cue 忽略，未知状态发出开发日志警告。

## 来源与许可

钢琴采样：**Alexander Holm · Salamander Grand Piano v3 · CC BY 3.0 Unported**。采样经过变调、包络处理、重新配器与混音；旋律、音序与音效为项目程序制作。不是人类钢琴家的完整演奏录音。本次仅读取已缓存且 SHA-256 与原档案一致的采样，没有调用付费服务或外部生成 API。

- [上游项目](https://github.com/sfzinstruments/SalamanderGrandPiano)，固定修订 `3382bf9496bba2486f5ab0de55a264d1dfc38404`；维护者 kinwie 整理的 FLAC 分发。
- [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)，[随素材保留的许可原文](assets/audio/Salamander-LICENSE.txt)。独立发行包也应包含署名与许可。
- [本次实际采样清单与 SHA-256](assets/audio/source/sample-manifest.json)、[逐音符配器及增益](assets/audio/source/arrangement.json)。OGG metadata 同样写入采样署名。

## 验证与重现

[离线机器记录](assets/audio/source/validation.json)保留解码时长、峰值、RMS、削波计数、循环边界与 36 组状态交叉淡入采样检查。三段均无削波；观察／归途边界最大相邻差分别约 `0.000595`／`0.000555`，低于附近普通波形的最大变化。留白边界为零。三段文件真峰分别为 −10.0、−18.8、−7.5 dBFS。

运行验证使用 Godot 4.7.2 与 Dummy 音频驱动，检查资源导入、GDScript、三态同步资源、初始化前设置、快速切换、连点限流、静音／重新启用、七种 cue 与跨越 46 秒循环。测试脚本为 [check_night_sound.gd](assets/audio/source/check_night_sound.gd)；运行结果在 [godot-validation.json](assets/audio/source/godot-validation.json)。引擎 Master 总线录到 46.997 秒实际混音，峰值 −10.449 dBFS，无削波；单独检查了离开场景时资源释放，退出无警告或错误。Dummy 播放与总线录制不能证明扬声器实际发声，更不能替代真人试听。

离线重建（依赖已存在的原谱、原渲染工具与原采样 cache）：

```sh
/tmp/moon-audio-venv/bin/python works/moon-office/native/assets/audio/source/render_native_audio.py --cache /tmp/moon-piano-samples
```

源目录设有 `.gdignore`，不会作为游戏资源导入。原有网页音频与 `audio-source` 文件未修改。待人工试听的重点是留白是否可辨、金属轻碰与真正扣合是否区分、灯移动是否过重、状态交叠是否自然，以及小扬声器上的低音与软布声是否仍合适。

实现依据：Godot 官方 [AudioStreamSynchronized](https://docs.godotengine.org/en/stable/classes/class_audiostreamsynchronized.html) 的同步子流与增益接口、[AudioStreamOggVorbis](https://docs.godotengine.org/en/stable/classes/class_audiostreamoggvorbis.html) 的循环属性、[AudioStreamPlayer](https://docs.godotengine.org/en/stable/classes/class_audiostreamplayer.html) 的线性音量与播放接口。文档核查日期：2026-09-21。
