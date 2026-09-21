#!/usr/bin/env python3
"""Verify portable ZIP integrity, architecture, embedded PCK and build hashes."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import struct
import zipfile

PROJECT = Path(__file__).resolve().parents[1]
DIST = PROJECT / "dist"
checks = []
for package in json.loads((DIST / "build-manifest.json").read_text()):
    archive = DIST / package["archive"]
    with archive.open("rb") as source:
        assert hashlib.file_digest(source, "sha256").hexdigest() == package["archive_sha256"], "ZIP hash mismatch"
    with zipfile.ZipFile(archive) as bundle:
        assert bundle.testzip() is None, "ZIP CRC mismatch"
        prefix = f"moon-office-native-{package['target']}/"
        for member in bundle.namelist():
            path = PurePosixPath(member)
            assert member.startswith(prefix) and not path.is_absolute() and ".." not in path.parts, "Unsafe ZIP path"
        runtime_prefix = prefix + package["runtime"] + "/"
        if package.get("runtime_kind") == "app_bundle":
            names = [name for name in bundle.namelist() if name.startswith(runtime_prefix) and not name.endswith("/")]
            assert runtime_prefix + "Contents/Info.plist" in names, "Missing macOS Info.plist"
            assert runtime_prefix + "Contents/PkgInfo" in names, "Missing macOS PkgInfo"
            runtime_binary_member = prefix + package["runtime_binary"]
            assert runtime_binary_member in names, "Missing macOS executable"
            binary = bundle.read(runtime_binary_member)
            assert binary[:4] in (b"\xca\xfe\xba\xbe", b"\xbe\xba\xfe\xca"), "Expected macOS universal Mach-O"
            assert binary[:4] == b"\xca\xfe\xba\xbe", "Expected big-endian universal Mach-O header"
            arch_count = struct.unpack_from(">I", binary, 4)[0]
            arch_types = {struct.unpack_from(">I", binary, 8 + index * 20)[0] for index in range(arch_count)}
            assert {0x01000007, 0x0100000C}.issubset(arch_types), "Expected macOS x86_64 and arm64 slices"
            pcks = [name for name in names if name.lower().endswith(".pck")]
            assert pcks and any(bundle.read(name)[:4] == b"GDPC" for name in pcks), "Missing Godot resource pack"
            mode = bundle.getinfo(runtime_binary_member).external_attr >> 16
            assert mode & 0o111, "macOS ZIP has lost executable mode"
        else:
            binary = bundle.read(prefix + package["runtime"])
            assert binary[-4:] == b"GDPC", "Missing embedded Godot resource pack footer"
        assert hashlib.sha256(binary).hexdigest() == package["runtime_sha256"], "Runtime hash mismatch"
        if package["target"].startswith("linux"):
            assert binary[:5] == b"\x7fELF\x02", "Expected ELF64"
            assert struct.unpack_from("<H", binary, 18)[0] == 62, "Expected x86_64 ELF"
            mode = bundle.getinfo(prefix + package["runtime"]).external_attr >> 16
            assert mode & 0o111, "Linux ZIP has lost executable mode"
        elif package["target"].startswith("windows"):
            assert binary[:2] == b"MZ", "Expected Windows PE"
            offset = struct.unpack_from("<I", binary, 0x3C)[0]
            assert binary[offset:offset+4] == b"PE\0\0", "Missing PE header"
            assert struct.unpack_from("<H", binary, offset + 4)[0] == 0x8664, "Expected AMD64 PE"
        for required in ("README.txt", "BUILD.json", "LICENSE-GODOT.txt", "CREDITS.txt", "licenses/audio/Salamander-LICENSE.txt"):
            assert prefix + required in bundle.namelist(), f"Missing {required}"
        checks.append({"archive": archive.name, "architecture": package["target"], "sha256": package["archive_sha256"], "zip_crc": "pass", "embedded_pck": "pass", "licenses": "pass"})
results = PROJECT / "test-results/packages"
results.mkdir(parents=True, exist_ok=True)
(results / "integrity.json").write_text(json.dumps(checks, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(checks, ensure_ascii=False, indent=2))
