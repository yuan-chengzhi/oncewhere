#!/usr/bin/env python3
"""Install the pinned official standard Godot editor and x86_64 export templates."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.request
import zipfile

TOOLS = Path(__file__).resolve().parent
PIN = json.loads((TOOLS / "toolchain.json").read_text())
DATA_HOME = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local/share"))
INSTALL_ROOT = DATA_HOME / "oncewhere-tools/godot" / PIN["release"]
EXECUTABLE = INSTALL_ROOT / f"Godot_v{PIN['release']}_linux.x86_64"
TEMPLATES = DATA_HOME / "godot/export_templates" / PIN["template_version"]
TEMPLATE_FILES = {
    "version.txt", "linux_release.x86_64", "linux_debug.x86_64",
    "windows_release_x86_64.exe", "windows_debug_x86_64.exe", "macos.zip",
}


def sha256(path):
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


def install(no_templates=False):
    INSTALL_ROOT.mkdir(parents=True, exist_ok=True)
    for name, expected in PIN["artifacts"].items():
        if no_templates and name.endswith(".tpz"):
            continue
        target = INSTALL_ROOT / name
        if not target.exists():
            url = f"https://github.com/godotengine/godot-builds/releases/download/{PIN['release']}/{name}"
            temporary = target.with_suffix(target.suffix + ".part")
            print(f"Downloading official release: {name}", flush=True)
            with urllib.request.urlopen(url) as response, temporary.open("wb") as output:
                while chunk := response.read(1024 * 1024):
                    output.write(chunk)
            temporary.replace(target)
        actual = sha256(target)
        if actual != expected:
            raise RuntimeError(f"SHA256 mismatch: {target}\nExpected {expected}\nFound {actual}")
        print(f"Verified {name}: {actual}", flush=True)
        with zipfile.ZipFile(target) as archive:
            if name.endswith(".zip"):
                EXECUTABLE.write_bytes(archive.read(EXECUTABLE.name))
                EXECUTABLE.chmod(0o755)
            else:
                TEMPLATES.mkdir(parents=True, exist_ok=True)
                for member in archive.namelist():
                    basename = Path(member).name
                    if basename in TEMPLATE_FILES:
                        (TEMPLATES / basename).write_bytes(archive.read(member))
    actual_version = subprocess.check_output([str(EXECUTABLE), "--headless", "--version"], text=True).strip()
    if actual_version != PIN["version"]:
        raise RuntimeError(f"Unexpected Godot version: {actual_version}")
    print(f"Godot: {EXECUTABLE}\nVersion: {actual_version}\nTemplates: {TEMPLATES}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-templates", action="store_true")
    install(parser.parse_args().no_templates)
