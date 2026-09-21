#!/usr/bin/env python3
"""Build self-contained, unsigned desktop packages for Linux, Windows and macOS."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import zipfile

from bootstrap import EXECUTABLE, PIN, TEMPLATES, TEMPLATE_FILES

PROJECT = Path(__file__).resolve().parents[1]
TARGETS = {
    "linux-x86_64": {"preset": "Linux x86_64", "runtime": "moon-office.x86_64", "kind": "executable"},
    "windows-x86_64": {"preset": "Windows x86_64", "runtime": "moon-office.exe", "kind": "executable"},
    "macos-universal": {"preset": "macOS", "runtime": "moon-office.app", "kind": "app_bundle"},
}


def digest(path):
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def bundle_executable(bundle):
    candidates = sorted((bundle / "Contents" / "MacOS").iterdir())
    files = [item for item in candidates if item.is_file()]
    if len(files) != 1:
        raise RuntimeError(f"Expected one macOS executable in {bundle / 'Contents' / 'MacOS'}, found {files}")
    return files[0]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", choices=["all", *TARGETS], default="all")
    args = parser.parse_args()
    if not EXECUTABLE.is_file() or not all((TEMPLATES / name).is_file() for name in TEMPLATE_FILES):
        raise SystemExit("Run python3 tools/bootstrap.py first.")
    version = subprocess.check_output([str(EXECUTABLE), "--headless", "--version"], text=True).strip()
    if version != PIN["version"]:
        raise SystemExit(f"Expected pinned Godot {PIN['version']}, found {version}")
    output = PROJECT / "dist"
    output.mkdir(exist_ok=True)
    env = dict(os.environ, LC_ALL="C.UTF-8")
    subprocess.run([str(EXECUTABLE), "--headless", "--path", str(PROJECT), "--editor", "--import"], check=True, env=env)
    manifests = []
    for target, settings in TARGETS.items():
        if args.target not in ("all", target):
            continue
        preset = settings["preset"]
        runtime_name = settings["runtime"]
        staging = output / target
        if staging.exists():
            shutil.rmtree(staging)
        staging.mkdir(exist_ok=True)
        runtime_path = staging / runtime_name
        subprocess.run([str(EXECUTABLE), "--headless", "--path", str(PROJECT), "--export-release", preset, str(runtime_path)], check=True, env=env)
        if settings["kind"] == "app_bundle":
            if not runtime_path.is_dir():
                raise RuntimeError(f"Export did not create a macOS app bundle: {runtime_path}")
            runtime_binary = bundle_executable(runtime_path)
        else:
            runtime_binary = runtime_path
            if not runtime_binary.is_file() or runtime_binary.stat().st_size < 1_000_000:
                raise RuntimeError(f"Export did not create a usable runtime: {runtime_binary}")
            if target.startswith("linux"):
                runtime_binary.chmod(0o755)
        readme = PROJECT / "README.md"
        if readme.is_file():
            shutil.copyfile(readme, staging / "README.txt")
        else:
            (staging / "README.txt").write_text("月背拾遗司 · 原生微缩剧场样段\n\n解压整个文件夹后运行 " + runtime_name + "。无需 Godot 编辑器、Python 或联网。\n此为未签名的试作便携包。\n", encoding="utf-8")
        shutil.copyfile(PROJECT / "tools/LICENSE-GODOT.txt", staging / "LICENSE-GODOT.txt")
        for asset in (PROJECT / "assets").rglob("*"):
            if asset.is_file() and any(word in asset.name.upper() for word in ("LICENSE", "OFL", "COPYING")):
                target_license = staging / "licenses" / asset.relative_to(PROJECT / "assets")
                target_license.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(asset, target_license)
        (staging / "CREDITS.txt").write_text(
            "月背拾遗司 · 原生微缩剧场样段\n\n"
            "Godot Engine 4.7.2 — MIT，见 LICENSE-GODOT.txt。\n"
            "钢琴采样：Alexander Holm · Salamander Grand Piano v3 · CC BY 3.0 Unported。\n"
            "采样经过变调、包络处理、重新配器与混音；音序与音效由项目程序制作。\n"
            "https://github.com/sfzinstruments/SalamanderGrandPiano\n"
            "https://creativecommons.org/licenses/by/3.0/\n"
            "许可原文见 licenses/audio/Salamander-LICENSE.txt。\n"
            "场景与角色插画由 OpenAI 图像生成工具为本作品生成。\n"
            "字体与其他资产的上游许可见 licenses/。\n",
            encoding="utf-8",
        )
        for asset_license in (PROJECT / "assets/LICENSES.md", PROJECT / "assets/README.md"):
            if asset_license.is_file():
                shutil.copyfile(asset_license, staging / "ASSET-LICENSES.md")
                break
        manifest = {
            "title": "月背拾遗司 · 原生微缩剧场样段", "target": target,
            "godot": version, "unsigned": True, "runtime": runtime_name,
            "runtime_kind": settings["kind"], "runtime_binary": str(runtime_binary.relative_to(staging)),
            "runtime_sha256": digest(runtime_binary), "runtime_bytes": runtime_binary.stat().st_size,
            "requires_editor": False, "renderer": "Compatibility / OpenGL 3.3",
        }
        (staging / "BUILD.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        archive = output / f"moon-office-native-{target}.zip"
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as package:
            for path in sorted(staging.rglob("*")):
                if path.is_file():
                    package.write(path, f"moon-office-native-{target}/{path.relative_to(staging)}")
        manifest.update(archive=archive.name, archive_sha256=digest(archive), archive_bytes=archive.stat().st_size)
        manifests.append(manifest)
        print(json.dumps(manifest, ensure_ascii=False, indent=2), flush=True)
    (output / "build-manifest.json").write_text(json.dumps(manifests, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output / "SHA256SUMS.txt").write_text("".join(f"{item['archive_sha256']}  {item['archive']}\n" for item in manifests), encoding="utf-8")


if __name__ == "__main__":
    main()
