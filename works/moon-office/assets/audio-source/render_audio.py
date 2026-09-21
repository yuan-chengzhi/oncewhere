"""Reproducible score and foley for 月背拾遗司, 2026-09-21.

Python 3 + numpy, scipy, soundfile, imageio-ffmpeg, mido.
Run: python render_audio.py --cache /tmp/moon-piano-samples
Only used piano recordings are downloaded; they are not shipped in the app.
Piano source: Alexander Holm, Salamander Grand Piano v3, CC BY 3.0.
This is a newly programmed composition/performance, not a human performance.
"""

from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from fractions import Fraction
import argparse
import hashlib
import json
import math
import subprocess
import urllib.parse
import urllib.request

import imageio_ffmpeg
import mido
import numpy as np
import soundfile as sf
from scipy import signal

SR = 44100
ARCHIVE = Path(__file__).resolve().parent
WORK = ARCHIVE.parent.parent
OUT = WORK / "public" / "audio"
REVISION = "3382bf9496bba2486f5ab0de55a264d1dfc38404"
BASE = f"https://raw.githubusercontent.com/sfzinstruments/SalamanderGrandPiano/{REVISION}/"
RNG = np.random.default_rng(70921)


def midi(name):
    offsets = dict(C=0, D=2, E=4, F=5, G=7, A=9, B=11)
    return (int(name[-1]) + 1) * 12 + offsets[name[0]] + name.count("#") - name.count("b")


# Each bar has a bass and three upper voices. Open voicings leave space for text.
HARMONY = [
    ("D2", "A3 D4 E4 F#4"), ("C#3", "A3 D4 E4 F#4"),
    ("B2", "A3 D4 F#4"), ("G2", "B3 D4 F#4"),
    ("E3", "G3 B3 D4 F#4"), ("A2", "G3 B3 D4 E4"),
    ("D3", "A3 C#4 E4 F#4"), ("A2", "F#3 B3 C#4 E4"),
    ("D2", "A3 D4 E4 F#4"), ("F#2", "A3 C#4 E4"),
    ("B2", "A3 C#4 D4 F#4"), ("A2", "B3 D4 F#4"),
    ("G2", "A3 B3 D4 F#4"), ("E3", "G3 B3 D4"),
    ("A2", "G3 A3 C#4 E4"), ("D3", "A3 D4 E4 F#4"),
    ("G2", "A3 B3 D4 F#4"), ("F#2", "A3 D4 E4"),
    ("E3", "G3 B3 D4 F#4"), ("A2", "G3 B3 C#4 E4"),
    ("B2", "A3 C#4 D4 F#4"), ("F#2", "A3 C#4 E4"),
    ("G2", "B3 D4 F#4"), ("A2", "F#3 B3 C#4 E4"),
    ("D2", "A3 D4 E4 F#4"), ("C#3", "A3 D4 E4 F#4"),
    ("B2", "A3 D4 F#4"), ("G2", "B3 D4 F#4"),
    ("E3", "G3 B3 D4 F#4"), ("A2", "G3 B3 C#4 E4"),
    ("D3", "A3 D4 E4 F#4"), ("D3", "A3 B3 D4 E4"),
]

# (beat, note, held beats). A question, its answer, a little upward excursion,
# and a quieter return. Rests are intentional; there is no endlessly running arp.
MELODY = [
    [(0.25,"F#5",1.15),(1.65,"E5",0.6),(2.4,"D5",0.45)],
    [(0.2,"C#5",1.25),(1.9,"A4",0.8)],
    [(0.1,"D5",0.7),(1.0,"F#5",0.7),(2.0,"E5",0.65)],
    [(0.1,"D5",1.5),(2.15,"B4",0.7)],
    [(0.2,"B4",0.8),(1.25,"D5",0.7),(2.15,"F#5",0.6)],
    [(0.15,"E5",1.5),(2.1,"C#5",0.6)],
    [(0.15,"D5",2.2)],
    [(1.1,"A4",0.6),(2.1,"B4",0.55)],
    [(0.15,"F#5",1.05),(1.45,"E5",0.5),(2.05,"D5",0.7)],
    [(0.15,"C#5",0.7),(1.05,"E5",0.65),(2.05,"A5",0.7)],
    [(0.2,"F#5",1.3),(1.8,"E5",0.9)],
    [(0.2,"D5",1.6),(2.25,"B4",0.5)],
    [(0.15,"B4",0.7),(1.1,"D5",0.65),(2.0,"G5",0.7)],
    [(0.15,"F#5",0.65),(1.05,"E5",0.65),(2.0,"D5",0.7)],
    [(0.1,"E5",1.1),(1.45,"D5",0.4),(2.05,"C#5",0.7)],
    [(0.2,"D5",2.35)],
    [(0.3,"D5",0.7),(1.25,"G5",0.65),(2.15,"A5",0.6)],
    [(0.15,"F#5",1.1),(1.6,"E5",0.45),(2.25,"D5",0.5)],
    [(0.15,"E5",0.65),(1.1,"G5",0.65),(2.0,"B5",0.75)],
    [(0.15,"A5",1.65),(2.2,"E5",0.55)],
    [(0.15,"F#5",0.8),(1.2,"E5",0.65),(2.1,"D5",0.55)],
    [(0.2,"C#5",0.85),(1.3,"A4",1.2)],
    [(0.2,"B4",0.65),(1.1,"D5",0.6),(1.95,"F#5",0.8)],
    [(0.15,"E5",2.1)],
    [(0.2,"F#5",1.2),(1.65,"E5",0.5),(2.3,"D5",0.5)],
    [(0.2,"C#5",1.25),(1.85,"A4",0.9)],
    [(0.2,"D5",0.7),(1.1,"F#5",0.65),(2.05,"E5",0.65)],
    [(0.15,"D5",1.5),(2.15,"B4",0.65)],
    [(0.2,"B4",0.75),(1.2,"D5",0.7),(2.15,"F#5",0.6)],
    [(0.2,"E5",1.3),(1.85,"C#5",0.8)],
    [(0.2,"D5",2.3)],
    [(0.15,"A4",1.8)],
]


def compose():
    durations = []
    for bar in range(32):
        # Shaped phrase ends and inhalations, repeated identically for the loop.
        phrase = [1.012, .988, .982, 1.035, .990, 1.010, 1.025, 1.060][bar % 8]
        durations.append(3 * 60 / 64 * phrase)
    # Exactly 92 seconds, so the audio loop has a stable sample boundary.
    durations = np.array(durations) * (92 / sum(durations))
    starts = np.concatenate(([0], np.cumsum(durations)))
    events = []

    def note(bar, beat, pitch, held, role, velocity):
        unit = durations[bar] / 3
        # Tiny, deterministic hand timing; bass leads melody slightly.
        delay = RNG.uniform(-.012, .014) + (0.010 if role == "melody" else 0)
        onset = starts[bar] + max(.035, beat * unit + delay)
        finger_off = onset + held * unit
        # Sustain pedal clears near the end of each bar, with gentle release.
        pedal_off = starts[bar + 1] - .070
        hold = max(finger_off, pedal_off) - onset
        events.append(dict(time=round(onset,6), note=midi(pitch),
                           duration=round(hold,6), role=role, velocity=velocity,
                           bar=bar+1, beat=beat))

    for bar, (bass, chord_text) in enumerate(HARMONY):
        chord = chord_text.split()
        curve = .92 + .10 * math.sin(math.pi * (bar % 8) / 8)
        if bar >= 24:
            curve *= .93
        note(bar,0.04,bass,1.1,"bass",int(41*curve+RNG.integers(-2,3)))
        # Three related accompaniment gestures, with room for each phrase ending.
        if bar % 8 in (3,7):
            note(bar,.95,chord[1],1.1,"inner",int(42*curve))
            note(bar,1.02,chord[-1],1.1,"inner",int(40*curve))
        elif bar % 4 == 1:
            note(bar,.78,chord[0],.7,"inner",int(40*curve))
            note(bar,1.4,chord[2],.7,"inner",int(43*curve))
            note(bar,2.2,chord[-1],.55,"inner",int(41*curve))
        else:
            note(bar,.83,chord[0],.65,"inner",int(39*curve))
            note(bar,1.46,chord[1],.7,"inner",int(42*curve))
            note(bar,2.12,chord[-1],.65,"inner",int(42*curve))
        for idx, (beat,pitch,held) in enumerate(MELODY[bar]):
            vel = (59 if idx == 0 else 55) * curve
            if 16 <= bar < 24:
                vel += 3
            note(bar,beat,pitch,held,"melody",int(vel+RNG.integers(-2,3)))
    return sorted(events,key=lambda e:e["time"]),starts


def sample_key(note,velocity):
    root = int(round(note/3))*3
    names = {0:"C",3:"D#",6:"F#",9:"A"}
    name = names[root%12] + str(root//12-1)
    layer = 4 if velocity <= 43 else 6 if velocity <= 50 else 8
    return f"{name}v{layer}.flac",root


def download(url,dest):
    if not dest.exists():
        with urllib.request.urlopen(url,timeout=90) as response:
            data=response.read()
        dest.write_bytes(data)
    return dest


def room(audio):
    """Short, dark stereo chamber: early reflections + very low diffuse tail."""
    n=int(1.8*SR)
    t=np.arange(n)/SR
    ir=np.zeros((n,2))
    for ch in (0,1):
        local=np.random.default_rng(799+ch)
        diffuse=signal.sosfilt(signal.butter(2,3300,fs=SR,output="sos"),local.normal(0,1,n))
        diffuse *= np.exp(-t/0.28) * (1-np.exp(-t/0.018))
        diffuse /= np.sqrt(np.sum(diffuse**2))
        ir[:,ch]=diffuse*.11
        for delay,gain in [(0.023,.055),(.039,.04),(.067,.028),(.101,.018)]:
            ir[int((delay+ch*.0021)*SR),ch]+=gain
    result=np.zeros((len(audio)+n-1,2),dtype=np.float32)
    for ch in (0,1):
        result[:,ch]=signal.fftconvolve(audio[:,ch],ir[:,ch])
    result[:len(audio)]+=audio
    return result


def peak_normalize(audio,peak_db):
    return audio * (10**(peak_db/20)/max(np.max(np.abs(audio)),1e-12))


def fades(audio,attack=.005,release=.035):
    a=min(int(attack*SR),len(audio))
    r=min(int(release*SR),len(audio))
    audio[:a]*=np.linspace(0,1,a)[:,None]**1.5
    audio[-r:]*=np.linspace(1,0,r)[:,None]**1.5
    return audio


def render_music(events,cache):
    required={sample_key(e["note"],e["velocity"])[0] for e in events}
    cache.mkdir(parents=True,exist_ok=True)
    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(lambda name:download(BASE+"Samples/"+urllib.parse.quote(name),cache/name),sorted(required)))
    print(f"Downloaded/loaded {len(required)} real piano recordings.",flush=True)
    length=92*SR
    raw=np.zeros((length*3+8*SR,2),dtype=np.float32)
    samples={}
    manifest=[]
    for name in sorted(required):
        y,rate=sf.read(cache/name,dtype="float32",always_2d=True)
        if rate != SR:
            y=signal.resample_poly(y,147,160).astype(np.float32)
        # Keep the close microphone stereo image but make the centre firmer.
        mid=y.mean(axis=1,keepdims=True)
        y=mid*.32+y*.68
        samples[name]=y
        manifest.append({"file":name,"source":BASE+"Samples/"+urllib.parse.quote(name),
                         "sha256":hashlib.sha256((cache/name).read_bytes()).hexdigest()})
    for e in events:
        name,root=sample_key(e["note"],e["velocity"])
        y=samples[name]
        ratio=2**((e["note"]-root)/12)
        if abs(ratio-1)>.00001:
            frac=Fraction(1/ratio).limit_denominator(1500)
            y=signal.resample_poly(y,frac.numerator,frac.denominator).astype(np.float32)
        release=.82 if e["role"]=="melody" else .66
        dur=min(len(y),int((e["duration"]+release)*SR))
        y=y[:dur].copy()
        hold=min(int(e["duration"]*SR),dur)
        if dur>hold:
            env=np.linspace(0,1,dur-hold)
            y[hold:]*=(np.cos(env*np.pi/2)**2)[:,None]
        attack=min(100,len(y))
        y[:attack]*=np.linspace(0,1,attack)[:,None]
        role_gain={"bass":.88,"inner":.60,"melody":1.00}[e["role"]]
        reference=40 if e["velocity"]<=43 else 48 if e["velocity"]<=50 else 60
        y*=role_gain*(e["velocity"]/reference)**1.6
        for cycle in range(3):
            start=round(e["time"]*SR)+cycle*length
            raw[start:start+len(y)]+=y
    # Mildly rounded top end, no heavy compression or hiss bed.
    raw=signal.sosfilt(signal.butter(2,[35,7400],fs=SR,btype="bandpass",output="sos"),raw,axis=0).astype(np.float32)
    wet=room(raw)
    # Middle full pass includes exactly the preceding pass's resonances.
    loop=wet[length:length*2].copy()
    loop=peak_normalize(loop,-3.8)
    master=cache/"moon-office-theme-master.wav"
    sf.write(master,loop,SR,subtype="PCM_24")
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    metadata=["-metadata","title=第七号柜 · A Place for the Moon",
              "-metadata","artist=oncewhere · original programmed score",
              "-metadata","comment=Piano samples: Alexander Holm, Salamander Grand Piano v3, CC BY 3.0; re-pitched, enveloped, arranged and mixed."]
    for ext,opts in [("ogg",["-c:a","libvorbis","-q:a","6"]),("mp3",["-c:a","libmp3lame","-b:a","192k"]),("flac",["-c:a","flac","-compression_level","8"])]:
        dest=(ARCHIVE if ext=="flac" else OUT)/f"moon-office-theme.{ext}"
        subprocess.run([ffmpeg,"-y","-v","error","-i",str(master),*opts,*metadata,str(dest)],check=True)
    (ARCHIVE/"sample-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
    return loop


def stereo(x,width=.12):
    if x.ndim==2:
        return x
    delay=int(.0023*SR)
    right=x*(1-width)+np.concatenate((np.zeros(delay),x[:-delay]))*width
    return np.column_stack((x,right))


def noise_band(n,low,high,rng):
    return signal.sosfilt(signal.butter(2,[low,high],btype="bandpass",fs=SR,output="sos"),rng.normal(0,1,n))


def wood_hit(n,rng,weight=1):
    t=np.arange(n)/SR
    x=np.zeros(n)
    for hz,amp,decay in [(126,.45,.060),(247,.27,.047),(436,.16,.033),(711,.08,.025)]:
        x+=amp*np.sin(2*np.pi*hz*weight*t+rng.uniform(0,1))*np.exp(-t/decay)
    x+=noise_band(n,200,5000,rng)*.14*np.exp(-t/.009)
    return x*(1-np.exp(-t/.001))


def make_foley():
    result={}
    rng=np.random.default_rng(7007)
    for name,duration,opening in [("drawer-open",1.18,True),("drawer-close",.94,False)]:
        n=int(duration*SR); t=np.arange(n)/SR
        envelope=np.sin(np.pi*np.clip(t/duration,0,1))**1.1
        friction=noise_band(n,90,1650,rng)
        grain=1+.19*np.sin(t*2*np.pi*37)+.1*np.sin(t*2*np.pi*83)
        x=friction*envelope*grain*.12
        # Irregular small rail knocks, then a felted wooden stop.
        taps=[(.045,.18),(.33,.04),(.78,.05),(1.04,.28)] if opening else [(.025,.08),(.25,.04),(.56,.05),(.78,.38)]
        for at,gain in taps:
            start=int(at*SR)
            x[start:]+=wood_hit(n-start,rng,1+rng.uniform(-.1,.1))*gain
        result[name]=fades(peak_normalize(stereo(x),-11),.006,.09)
    n=int(.64*SR);t=np.arange(n)/SR
    fiber=noise_band(n,600,9500,rng)
    env=np.exp(-((t-.2)/.12)**2)*.25+np.exp(-((t-.41)/.048)**2)*.55
    x=fiber*env*(.65+.35*np.sin(2*np.pi*t*43)**2)
    for at in [.06,.17,.29,.43,.47]:
        start=int(at*SR);end=min(n,start+int(.025*SR))
        x[start:end]+=noise_band(end-start,1600,10000,rng)*np.exp(-np.arange(end-start)/(.005*SR))*.16
    result["paper-turn"]=fades(peak_normalize(stereo(x,.3),-15),.015,.06)
    n=int(.52*SR);t=np.arange(n)/SR
    x=np.zeros(n)
    for at,gain in [(.018,.8),(.094,.55)]:
        i=int(at*SR);u=t[:n-i]
        click=noise_band(len(u),850,10500,rng)*np.exp(-u/.006)*.55
        for hz,amp in [(1720,.18),(2950,.12),(4673,.045)]:
            click+=np.sin(2*np.pi*hz*u)*np.exp(-u/.037)*amp
        x[i:]+=click*gain
    result["clasp"]=fades(peak_normalize(stereo(x),-13),.003,.06)
    # Small hanging silver bell. Inharmonic partials, no sharp alarm-like sine.
    n=int(2.6*SR);t=np.arange(n)/SR
    x=np.zeros(n)
    for ratio,amp,tau in [(1,.8,.68),(2.756,.27,.39),(5.404,.10,.21),(8.93,.04,.12)]:
        x+=amp*np.sin(2*np.pi*880*ratio*t)*np.exp(-t/tau)
    x*=1-np.exp(-t/.003)
    result["little-bell"]=fades(peak_normalize(stereo(x,.24),-17),.003,.16)
    for name,y in result.items():
        sf.write(OUT/f"{name}.wav",y,SR,subtype="PCM_16")
    return result


def export_midi(events,starts):
    score=mido.MidiFile(ticks_per_beat=960)
    track=mido.MidiTrack();score.tracks.append(track)
    track.append(mido.MetaMessage("track_name",name="A Place for the Moon - original piano"))
    track.append(mido.MetaMessage("set_tempo",tempo=500000))
    track.append(mido.Message("program_change",program=0,time=0))
    ordered=[]
    for e in events:
        ordered.append((round(e["time"]*1920),mido.Message("note_on",note=e["note"],velocity=e["velocity"])))
        ordered.append((round((e["time"]+e["duration"])*1920),mido.Message("note_off",note=e["note"],velocity=0)))
    previous=0
    for tick,msg in sorted(ordered,key=lambda p:p[0]):
        msg.time=tick-previous;track.append(msg);previous=tick
    score.save(ARCHIVE/"moon-office-theme.mid")
    (ARCHIVE/"score.json").write_text(json.dumps({"title":"第七号柜 · A Place for the Moon","time_signature":"3/4","nominal_bpm":64,"loop_seconds":92,"bar_starts":starts.tolist(),"events":events},ensure_ascii=False,indent=2)+"\n")


def measure(y):
    peak=float(np.max(np.abs(y)))
    return dict(seconds=round(len(y)/SR,6),sample_rate=SR,channels=y.shape[1],
                peak_dbfs=round(20*np.log10(max(peak,1e-12)),3),
                rms_dbfs=round(20*np.log10(max(float(np.sqrt(np.mean(y*y))),1e-12)),3),
                clipped_samples=int(np.sum(np.abs(y)>=1)),
                first_last_step=float(np.max(np.abs(y[0]-y[-1]))))


def main():
    parser=argparse.ArgumentParser();parser.add_argument("--cache",type=Path,default=Path("/tmp/moon-piano-samples"))
    args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    download(BASE+"LICENSE",ARCHIVE/"Salamander-LICENSE.txt")
    download(BASE+"README.md",ARCHIVE/"Salamander-README.md")
    events,starts=compose()
    export_midi(events,starts)
    music=render_music(events,args.cache)
    foley=make_foley()
    stats={"moon-office-theme-master":measure(music),**{name:measure(y) for name,y in foley.items()}}
    for extension in ["ogg","mp3","flac"]:
        path=(ARCHIVE if extension=="flac" else OUT)/f"moon-office-theme.{extension}"
        if extension=="mp3":
            decoded=args.cache/"decoded-mp3.wav"
            subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),"-y","-v","error","-i",str(path),str(decoded)],check=True)
            y,_=sf.read(decoded,always_2d=True)
        else:
            y,_=sf.read(path,always_2d=True)
        stats[path.name]=measure(y)
    # Audio-loop seam's sample step relative to ordinary neighbouring steps.
    stats["loop_seam"]={"seam_step":float(np.max(np.abs(music[0]-music[-1]))),
                         "nearby_largest_step":float(np.max(np.abs(np.diff(np.concatenate((music[-441:],music[:441])),axis=0))))}
    (ARCHIVE/"audio-validation.json").write_text(json.dumps(stats,indent=2)+"\n")
    print(json.dumps(stats,indent=2),flush=True)


if __name__=="__main__":
    main()
