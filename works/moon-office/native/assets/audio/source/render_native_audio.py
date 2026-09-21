"""Offline, reproducible adaptive score and material cues for the Godot study.

Uses the existing score and verified local Salamander cache. No network calls.
Piano samples: Alexander Holm, Salamander Grand Piano v3, CC BY 3.0.
Python environment: /tmp/moon-audio-venv/bin/python
"""

from pathlib import Path
from fractions import Fraction
import argparse
import hashlib
import importlib.util
import json
import math
import shutil
import subprocess
import sys

import imageio_ffmpeg
import numpy as np
import soundfile as sf
from scipy import signal

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
WORK = HERE.parents[3]
ORIGINAL = WORK / "assets/audio-source"
SR = 44100
LOOP = 46
STATES = ("observe", "hold", "resolve")
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("original_audio", ORIGINAL / "render_audio.py")
original = importlib.util.module_from_spec(spec)
spec.loader.exec_module(original)


def arrange():
    score = json.loads((ORIGINAL / "score.json").read_text())
    events = []
    # Two complete eight-bar phrases: the opening question and quiet return.
    # Every state uses the same notes/timing. Only orchestration density changes.
    for start_bar, end_bar, offset in [(1, 8, 0), (25, 32, 23)]:
        for event in score["events"]:
            if not start_bar <= event["bar"] <= end_bar:
                continue
            e = dict(event)
            e["source_bar"] = event["bar"]
            e["bar"] = event["bar"] - start_bar + 1 + (8 if offset else 0)
            e["time"] = round(event["time"] - score["bar_starts"][start_bar - 1] + offset, 6)
            local_bar = (e["bar"] - 1) % 8
            role = e["role"]
            if role == "bass":
                gains = {"observe": .67, "hold": .28 if local_bar % 2 == 0 else 0, "resolve": .70}
            elif role == "inner":
                gains = {"observe": .50 if e["beat"] < 1.5 else 0,
                         "hold": .16 if local_bar in (0, 3, 6) and e["beat"] < 1.5 else 0,
                         "resolve": .58 if e["beat"] < 1.5 else .34}
            else:
                gains = {"observe": .55 if local_bar in (0, 1, 6, 7) else 0,
                         "hold": .16 if local_bar == 6 else 0,
                         "resolve": .80 if e["bar"] <= 8 else .70}
            e["state_gain"] = gains
            events.append(e)
    return events


def render_music(events, cache):
    manifest = json.loads((ORIGINAL / "sample-manifest.json").read_text())
    known = {entry["file"]: entry for entry in manifest}
    required = sorted({original.sample_key(e["note"], e["velocity"])[0] for e in events})
    samples = {}
    for name in required:
        path = cache / name
        if not path.exists():
            raise FileNotFoundError(f"Missing verified local sample: {path}")
        if hashlib.sha256(path.read_bytes()).hexdigest() != known[name]["sha256"]:
            raise ValueError(f"Sample checksum differs from original manifest: {name}")
        y, rate = sf.read(path, dtype="float32", always_2d=True)
        if rate != SR:
            y = signal.resample_poly(y, SR, rate).astype(np.float32)
        samples[name] = y.mean(axis=1, keepdims=True) * .32 + y * .68
    frames = LOOP * SR
    raw = {state: np.zeros((frames * 3 + 6 * SR, 2), dtype=np.float32) for state in STATES}
    for e in events:
        name, root = original.sample_key(e["note"], e["velocity"])
        y = samples[name]
        ratio = 2 ** ((e["note"] - root) / 12)
        if abs(ratio - 1) > .00001:
            frac = Fraction(1 / ratio).limit_denominator(1500)
            y = signal.resample_poly(y, frac.numerator, frac.denominator).astype(np.float32)
        release = .82 if e["role"] == "melody" else .66
        duration = min(len(y), int((e["duration"] + release) * SR))
        y = y[:duration].copy()
        held = min(int(e["duration"] * SR), duration)
        if duration > held:
            y[held:] *= (np.cos(np.linspace(0, 1, duration - held) * np.pi / 2) ** 2)[:, None]
        y[:100] *= np.linspace(0, 1, 100)[:, None]
        role_gain = {"bass": .88, "inner": .60, "melody": 1.0}[e["role"]]
        reference = 40 if e["velocity"] <= 43 else 48 if e["velocity"] <= 50 else 60
        y *= role_gain * (e["velocity"] / reference) ** 1.6
        for state in STATES:
            gain = e["state_gain"][state]
            if not gain:
                continue
            for cycle in range(3):
                start = round(e["time"] * SR) + cycle * frames
                raw[state][start:start + len(y)] += y * gain
    loops = {}
    for state in STATES:
        filtered = signal.sosfilt(signal.butter(2, [35, 7400], fs=SR, btype="bandpass", output="sos"), raw.pop(state), axis=0).astype(np.float32)
        # Continuous three-pass rendering retains reverb/pedal tails at wrap.
        loops[state] = original.room(filtered)[frames:frames * 2].copy()
    gain = 10 ** (-7.5 / 20) / max(float(np.max(np.abs(y))) for y in loops.values())
    for state in STATES:
        loops[state] *= gain
    (HERE / "sample-manifest.json").write_text(json.dumps([known[n] for n in required], indent=2) + "\n")
    return loops


def finish(x, peak, attack=.006, release=.07):
    return original.fades(original.peak_normalize(original.stereo(x, .11), peak), attack, release)


def make_cues():
    rng = np.random.default_rng(7092201)
    cues = {}
    n = int(.42 * SR); t = np.arange(n) / SR
    # Fingers lift a small object from the desk; no confirmation tone.
    x = original.noise_band(n, 350, 3700, rng) * np.exp(-((t - .13) / .065) ** 2) * .06
    x += original.wood_hit(n, rng, 1.2) * .05 * np.exp(-t / .045)
    cues["pickup"] = finish(x, -23, .009, .08)

    n = int(.26 * SR); t = np.arange(n) / SR
    # A single damped touch, without the second latching contact.
    x = original.noise_band(n, 700, 4800, rng) * np.exp(-t / .012) * .30
    for hz, gain in [(1360, .17), (2420, .07), (3690, .025)]:
        x += gain * np.sin(2 * np.pi * hz * t) * np.exp(-t / .022)
    cues["blocked"] = finish(x, -22, .003, .08)

    n = int(.48 * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    # One latch event: the pressure contact and the smaller spring seating.
    for at, gain in [(.012, .70), (.069, .46)]:
        start = int(at * SR); u = t[:n - start]
        click = original.noise_band(len(u), 650, 6500, rng) * np.exp(-u / .0055) * .48
        for hz, amp, decay in [(1480, .17, .035), (2570, .08, .027), (4310, .025, .020)]:
            click += np.sin(2 * np.pi * hz * u) * np.exp(-u / decay) * amp
        x[start:] += click * gain
    cues["clasp"] = finish(x, -17.5, .003, .10)

    n = int(.84 * SR); t = np.arange(n) / SR
    fibers = original.noise_band(n, 170, 2400, rng)
    envelope = np.exp(-((t - .24) / .14) ** 2) * .42 + np.exp(-((t - .53) / .13) ** 2) * .20
    x = fibers * envelope * (.83 + .17 * np.sin(2 * np.pi * 27 * t) ** 2)
    # Felted, broad contact; deliberately no metal partials.
    x += original.noise_band(n, 60, 430, rng) * np.exp(-((t - .26) / .035) ** 2) * .15
    cues["cloth"] = finish(x, -22.5, .03, .12)

    for name, duration, opening in [("drawer_open", 1.18, True), ("drawer_close", .94, False)]:
        n = int(duration * SR); t = np.arange(n) / SR
        envelope = np.sin(np.pi * np.clip(t / duration, 0, 1)) ** 1.1
        x = original.noise_band(n, 90, 1650, rng) * envelope * (1 + .19 * np.sin(t * 2 * np.pi * 37)) * .12
        taps = [(.045, .18), (.33, .04), (.78, .05), (1.04, .28)] if opening else [(.025, .08), (.25, .04), (.56, .05), (.78, .38)]
        for at, gain in taps:
            start = int(at * SR)
            x[start:] += original.wood_hit(n - start, rng, 1 + rng.uniform(-.1, .1)) * gain
        cues[name] = finish(x, -20, .008, .10)

    n = int(.75 * SR); t = np.arange(n) / SR
    # Leather/wooden handle movement and a soft, short glass resonance.
    # This is a moved lamp, not an electrical chime or a magical success bell.
    x = original.noise_band(n, 180, 2600, rng) * np.exp(-((t - .16) / .09) ** 2) * .20
    start = int(.10 * SR); u = t[:n - start]
    for hz, amp, decay in [(612, .08, .08), (1021, .025, .05), (1730, .009, .025)]:
        x[start:] += np.sin(2 * np.pi * hz * u) * amp * np.exp(-u / decay) * (1 - np.exp(-u / .006))
    cues["lamp"] = finish(x, -23, .018, .12)
    return cues


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", type=Path, default=Path("/tmp/moon-piano-samples"))
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    events = arrange()
    music = render_music(events, args.cache)
    cues = make_cues()
    stats = {"human_listening_performed": False, "loop_seconds": LOOP, "music": {}, "cues": {}}
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    for state, y in music.items():
        temp = args.cache / f"native-{state}-master.wav"
        sf.write(temp, y, SR, subtype="PCM_24")
        dest = OUT / f"music-{state}.ogg"
        subprocess.run([ffmpeg, "-y", "-v", "error", "-i", str(temp), "-c:a", "libvorbis", "-q:a", "6",
                        "-metadata", f"title=第七号柜 · {state}", "-metadata", "artist=oncewhere · programmed score",
                        "-metadata", "comment=Piano samples: Alexander Holm, Salamander Grand Piano v3, CC BY 3.0; arranged, repitched, enveloped and mixed.", str(dest)], check=True)
        decoded, rate = sf.read(dest, always_2d=True)
        assert rate == SR and len(decoded) == LOOP * SR
        seam = float(np.max(np.abs(decoded[0] - decoded[-1])))
        nearby = np.concatenate((np.diff(decoded[-441:], axis=0), np.diff(decoded[:441], axis=0)))
        stats["music"][state] = {**original.measure(decoded), "active_note_events": sum(e["state_gain"][state] > 0 for e in events),
                                  "seam_step": seam, "nearby_largest_step": float(np.max(np.abs(nearby)))}
        assert stats["music"][state]["clipped_samples"] == 0
        assert seam < max(.001, float(np.max(np.abs(nearby))) * 1.5)
    for name, y in cues.items():
        dest = OUT / f"{name}.wav"
        sf.write(dest, y, SR, subtype="PCM_16")
        decoded, _ = sf.read(dest, always_2d=True)
        stats["cues"][name] = original.measure(decoded)
        assert stats["cues"][name]["clipped_samples"] == 0
        assert np.max(np.abs(decoded[[0, -1]])) == 0
    # Sample transitions at many musical offsets, including the loop boundary.
    # A convex, phase-aligned crossfade cannot exceed the louder source peak.
    transitions = []
    count = int(2.4 * SR)
    s = np.linspace(0, 1, count)
    curve = (s * s * (3 - 2 * s))[:, None]
    for outgoing in STATES:
        for incoming in STATES:
            if outgoing == incoming:
                continue
            worst_peak = 0
            for start_seconds in (0, 2.87, 8.47, 21.9, 32.0, 44.8):
                indices = (round(start_seconds * SR) + np.arange(count)) % (LOOP * SR)
                mixed = music[outgoing][indices] * (1 - curve) + music[incoming][indices] * curve
                worst_peak = max(worst_peak, float(np.max(np.abs(mixed))))
                assert worst_peak < 1
            transitions.append({"from": outgoing, "to": incoming, "offsets_tested": 6, "peak_dbfs": round(20 * math.log10(worst_peak), 3)})
    stats["offline_crossfades"] = transitions
    (HERE / "validation.json").write_text(json.dumps(stats, indent=2) + "\n")
    (HERE / "arrangement.json").write_text(json.dumps({"source": "../../../../assets/audio-source/score.json", "loop_seconds": LOOP,
        "sample_rate": SR, "source_bars": [[1, 8], [25, 32]], "events": events}, ensure_ascii=False, indent=2) + "\n")
    shutil.copyfile(ORIGINAL / "Salamander-LICENSE.txt", OUT / "Salamander-LICENSE.txt")
    print(json.dumps(stats, indent=2), flush=True)


if __name__ == "__main__":
    main()
