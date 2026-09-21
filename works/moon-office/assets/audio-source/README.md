# 音频制作档案

此目录保存《月背拾遗司》的无损母带、可编辑谱面、渲染程序、采样来源与许可，不属于网页发布目录。完整创作和验证记录见[声音制作记录](../../audio-notes.md)。

- [24 bit FLAC 母带](moon-office-theme.flac)
- [MIDI 音序](moon-office-theme.mid)、[完整谱面 JSON](score.json)
- [重现脚本](render_audio.py)、[采样来源与 SHA-256](sample-manifest.json)、[信号检查结果](audio-validation.json)
- [Salamander Grand Piano 原始说明](Salamander-README.md)、[CC BY 3.0 许可原文](Salamander-LICENSE.txt)

发布音频在 [public/audio](../../public/audio/)：OGG、MP3 和五个 WAV 音效。母带和制作档案放在 `assets/`，以免随公共静态资源打包。

从仓库根目录重现：

```sh
uv venv /tmp/moon-audio-venv
uv pip install --python /tmp/moon-audio-venv/bin/python numpy scipy soundfile imageio-ffmpeg mido
/tmp/moon-audio-venv/bin/python works/moon-office/assets/audio-source/render_audio.py --cache /tmp/moon-piano-samples
```

脚本根据自身路径确定作品目录，不依赖命令当前目录：OGG、MP3 和 WAV 写入 `../../public/audio/`；FLAC、MIDI、谱面、采样清单与检查结果写回本目录。上游 README 和许可若缺失，会按固定上游修订下载至本目录。原始钢琴采样与中间 WAV 只保留在 `--cache` 指定的临时目录。

随作品播放或交付音频时，仍需保留[声音制作记录中的采样署名](../../audio-notes.md#来源与许可)及[CC BY 3.0 许可链接](https://creativecommons.org/licenses/by/3.0/)。
