#!/usr/bin/env python3
"""Draw a real 3D frame through Xvfb and Compatibility; no headless rendering."""
import os
from pathlib import Path
import subprocess
import tempfile

PROJECT = Path(__file__).resolve().parents[1]
RESULTS = PROJECT / "test-results/toolchain"
RESULTS.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix="oncewhere-render-probe-") as directory:
    root = Path(directory)
    (root / "project.godot").write_text('config_version=5\n[application]\nconfig/name="Render probe"\n[display]\nwindow/size/viewport_width=640\nwindow/size/viewport_height=360\n[rendering]\nrenderer/rendering_method="gl_compatibility"\n')
    (root / "probe.gd").write_bytes((PROJECT / "tests/render_probe.gd").read_bytes())
    environment = dict(os.environ, LIBGL_ALWAYS_SOFTWARE="1", ONCEWHERE_PROBE_IMAGE=str(RESULTS / "compatibility.png"))
    result = subprocess.run([
        "xvfb-run", "-a", "-s", "-screen 0 1280x800x24", str(PROJECT / "tools/godot.sh"),
        "--path", directory, "--display-driver", "x11", "--rendering-method", "gl_compatibility",
        "--rendering-driver", "opengl3", "--audio-driver", "Dummy", "--script", "probe.gd",
    ], env=environment, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=40)
    (RESULTS / "compatibility.log").write_text(result.stdout)
    print(result.stdout)
    if result.returncode or "RENDER_PROBE " not in result.stdout or "ERROR:" in result.stdout:
        raise SystemExit(result.returncode or 1)
