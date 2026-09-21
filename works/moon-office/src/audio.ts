import { asset } from './assets';

export type Sound = 'drawer-open' | 'drawer-close' | 'paper-turn' | 'clasp' | 'little-bell';

/** One user-unlocked audio graph, with decoded buffers for gapless music. */
export class NightAudio {
  private context?: AudioContext;
  private musicGain?: GainNode;
  private effectGain?: GainNode;
  private source?: AudioBufferSourceNode;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private starting?: Promise<void>;
  private enabled = true;
  private volume = 0.42;
  private failed = false;

  constructor(private status: (enabled: boolean, failed: boolean) => void) {
    document.addEventListener('visibilitychange', () => {
      if (!this.context) return;
      if (document.hidden) void this.context.suspend();
      else if (this.enabled) void this.context.resume().catch(() => this.reportFailure());
    });
  }

  async unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.musicGain = this.context.createGain();
        this.musicGain.gain.value = 0;
        this.musicGain.connect(this.context.destination);
        this.effectGain = this.context.createGain();
        this.effectGain.gain.value = this.enabled ? 0.35 : 0;
        this.effectGain.connect(this.context.destination);
      }
      await this.context.resume();
      if (!this.source) this.starting ??= this.startMusic();
      await this.starting;
    } catch { this.reportFailure(); }
  }

  private load(file: string): Promise<AudioBuffer> {
    let pending = this.buffers.get(file);
    if (!pending) {
      pending = fetch(asset(`audio/${file}`)).then(async response => {
        if (!response.ok) throw new Error(`Audio unavailable: ${file}`);
        return this.context!.decodeAudioData(await response.arrayBuffer());
      });
      this.buffers.set(file, pending);
      pending.catch(() => this.buffers.delete(file));
    }
    return pending;
  }

  private async startMusic() {
    try {
      let buffer: AudioBuffer;
      try { buffer = await this.load('moon-office-theme.ogg'); }
      catch { buffer = await this.load('moon-office-theme.mp3'); }
      this.source = this.context!.createBufferSource();
      this.source.buffer = buffer;
      this.source.loop = true;
      this.source.connect(this.musicGain!);
      this.source.start();
      this.failed = false;
      this.applyVolume(1.8);
      this.status(this.enabled, false);
    } catch { this.starting = undefined; this.reportFailure(); }
  }

  private reportFailure() { this.failed = true; this.status(this.enabled, true); }

  private applyVolume(duration = 0.3) {
    if (!this.context || !this.musicGain || !this.effectGain) return;
    const now = this.context.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(this.enabled ? this.volume : 0, now + duration);
    this.effectGain.gain.setTargetAtTime(this.enabled ? 0.35 : 0, now, 0.04);
  }

  async setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) await this.unlock();
    this.applyVolume();
    this.status(this.enabled, this.failed);
  }

  setVolume(volume: number) { this.volume = Math.max(0, Math.min(0.8, volume)); this.applyVolume(); }

  async play(name: Sound) {
    if (!this.context || !this.enabled) return;
    try {
      const buffer = await this.load(`${name}.wav`);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.effectGain!);
      source.start();
    } catch { /* A missing effect must never stop the story. */ }
  }
}
