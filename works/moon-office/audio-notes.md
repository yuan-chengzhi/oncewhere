# 《月背拾遗司》声音制作记录

日期：2026-09-21。状态：可播放的首轮音乐与交互音效，已做文件和信号检查；当前工具环境不能主观聆听，因此**未做人工听感验收**，也未据此宣称音乐已达到最终发行品质。

## 音乐：《第七号柜 · A Place for the Moon》

为木柜夜班场景编写的钢琴小品。D 大调，3/4 拍，名义速度 64 BPM；32 小节形成主题、变化、上行中段、安静回归。开放排列的和声使用 Dadd9、Bm7、Gmaj7、Em9、A9 等色彩。旋律与伴奏均有停顿，乐句末尾略放慢。没有鼓组、持续噪声底或高频铺满的八音盒。

这是一份本轮新编的音序与程序演奏，**不是钢琴家演奏整首曲目的录音**。音色来自真实三角钢琴逐音录音；使用 19 个原始采样，分布于三个力度层，按实际谱面移调最多一个半音。每个声部具有不同触键力度，另加细微的时差、踏板式延音、低比例短室内混响和温和滤波。没有使用第三方完整曲目或模仿指定作曲家。

| 交付文件 | 用途 | 时长 / 格式 | 大小约 |
|---|---|---|---|
| [moon-office-theme.ogg](public/audio/moon-office-theme.ogg) | 推荐网页播放 | 精确 92 秒，44.1 kHz，双声道 Vorbis q6 | 1.4 MB |
| [moon-office-theme.mp3](public/audio/moon-office-theme.mp3) | 兼容回退 / 普通播放器试听 | 解码后精确 92 秒，44.1 kHz，192 kbps | 2.2 MB |
| [moon-office-theme.flac](assets/audio-source/moon-office-theme.flac) | 无损保留、后续调整 | 精确 92 秒，44.1 kHz，24 bit，双声道 | 8.9 MB |
| [moon-office-theme.mid](assets/audio-source/moon-office-theme.mid) | 可编辑音符及演奏时序 | MIDI，已展开速度呼吸 | 约 1.5 KB |
| [score.json](assets/audio-source/score.json) | 完整事件与小节位置 | 音符、力度、声部、持续时间、实际秒数 | 文本 |

### 来源与许可

钢琴采样为 **Alexander Holm 的 Salamander Grand Piano v3**，上游说明其以 48 kHz / 24 bit、16 个力度层录制 Yamaha C5 三角钢琴，许可 **CC BY 3.0 Unported**。本轮选择其中三层；谱面与混音重新制作，不使用上游的完整 SFZ 播放器映射。

- [上游项目与作者说明](https://github.com/sfzinstruments/SalamanderGrandPiano)。本次固定修订：`3382bf9496bba2486f5ab0de55a264d1dfc38404`。
- [上游原始来源](https://archive.org/details/SalamanderGrandPianoV3)。GitHub 维护者 kinwie 将原采样转为 FLAC 并整理映射；我们使用该 FLAC 分发。
- [CC BY 3.0 许可](https://creativecommons.org/licenses/by/3.0/)；[许可原文存档](assets/audio-source/Salamander-LICENSE.txt)、[上游 README 存档](assets/audio-source/Salamander-README.md)。
- [本轮实际使用采样清单](assets/audio-source/sample-manifest.json)：每项均有固定修订下载地址和 SHA-256。未将整套采样库加入网页。

建议在作品「制作与鸣谢」处显示以下文字并保留对应链接：

> 钢琴采样：Alexander Holm · Salamander Grand Piano v3 · CC BY 3.0。原采样经变调、包络处理与混音；旋律和音序为本作编写。

新增乐谱、程序演奏和合成音效属于本轮项目制作，本记录不另行替仓库设定整体开源许可。第三方采样的署名与许可说明需随音频交付保留。

### 循环与播放

循环范围为 **0–92.000 秒，共 4,057,200 个采样帧**。制作时连续渲染三次同一份演奏及混响，截取中间完整一轮，使上轮尾音自然进入下一轮开头；没有将结尾淡到静音。结尾回到 D 的开放和声，为重新开始留出呼吸。

推荐由首次点击开启声音，使用 Web Audio `decodeAudioData` 和 `AudioBufferSourceNode.loop = true`，并设置 `loopStart = 0`、`loopEnd = 92`。首次播放用约 1.5 秒淡入，暂停或静音用约 0.25 秒淡出。背景音乐增益可先从 `0.6` 开始调。通过可见开关保留随时静音的能力。

不依赖 `ended` 事件重新启动下一轮。直接用 HTML `<audio loop>` 也可播放，但其缓冲及 MP3 编解码行为仍需要在具体浏览器上确认，不能据离线检查保证所有设备完全无间隙。

## 物件音效

以下音效全部为本轮程序生成，没有下载外部录音。木柜采用带通摩擦噪声、微小不规则碰撞和木质衰减模态；纸声采用高频纤维摩擦及短脆响；扣件采用短促的两次金属接触；小铃使用不成整数倍的泛音与自然衰减。它们是风格化声音设计，不能称为现场拟音录制。

| 文件 | 时长 | 峰值 | 建议触发 |
|---|---:|---:|---|
| [drawer-open.wav](public/audio/drawer-open.wav) | 1.18 s | −11 dBFS | 抽屉开启一次 |
| [drawer-close.wav](public/audio/drawer-close.wav) | 0.94 s | −11 dBFS | 抽屉抵达关闭位置 |
| [paper-turn.wav](public/audio/paper-turn.wav) | 0.64 s | −15 dBFS | 翻票、揭标签 |
| [clasp.wav](public/audio/clasp.wav) | 0.52 s | −13 dBFS | 扣件实际扣合 |
| [little-bell.wav](public/audio/little-bell.wav) | 2.60 s | −17 dBFS | 确认重要发现，少量使用 |

音效均为 44.1 kHz / 16 bit 双声道 PCM WAV。文件已保留克制的电平，可从应用音效增益 `0.6` 开始；实际要根据背景音乐、触发频率与设备调整。同类声音应短暂限流，避免快速点击叠加许多层。铃声不作为普通按钮点击声。

## 已完成的验证

- 全部文件可以解码；音乐 OGG、MP3、FLAC 解码后均为 92.000 秒，声道数与采样率一致。
- OGG 经 FFmpeg EBU R128 分析：综合响度 **−19.8 LUFS**，响度范围 **3.1 LU**，真峰 **−3.7 dBFS**。
- 母带峰值 −3.8 dBFS；压缩版与全部音效无削波样本。音效起止均有包络，首尾值为零。
- 母带循环边界最大相邻帧差为 `0.000813`，附近普通波形最大相邻帧差为 `0.001787`；OGG 边界差为 `0.000462`。边界未引入超过附近正常波形变化的跳变。
- [机器检查结果](assets/audio-source/audio-validation.json)保留时长、峰值、RMS、削波数与循环边界数值。

后续集成检查已在 Chromium 验证首次用户操作后启动、实际音频解码与循环、静音、音量保存，以及独立收藏版断网播放；见[作品迭代记录](review.md)。仍未验证：真人对旋律与音色的主观评价、手机扬声器听感、真实 iOS/Android 浏览器及长时间后台恢复。信号检查与浏览器检查不能替代实际聆听。

## 重现与继续制作

[render_audio.py](assets/audio-source/render_audio.py)保存完整谱面、音效模型、混音与导出过程。母带、谱面与程序保存在 [assets/audio-source](assets/audio-source/README.md)，不进入公共静态资源包。第三方原始采样缓存在运行机器的临时目录；`public/audio/` 仅包含 OGG、MP3 和五个 WAV 播放文件。脚本按自身路径定位档案与发布目录，可从任意工作目录运行。

```sh
uv venv /tmp/moon-audio-venv
uv pip install --python /tmp/moon-audio-venv/bin/python numpy scipy soundfile imageio-ffmpeg mido
/tmp/moon-audio-venv/bin/python works/moon-office/assets/audio-source/render_audio.py --cache /tmp/moon-piano-samples
```

本轮使用 Python 3.13.15、NumPy 2.5.3、SciPy 1.18.1、SoundFile 0.14.0、imageio-ffmpeg 0.6.0、mido 1.3.3。所有伪随机细节固定种子；首次运行会从固定修订下载约 29 MB 的实际采样。
