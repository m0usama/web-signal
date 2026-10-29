"use client";

/**
 * Original chiptune alerts synthesised with the Web Audio API — no audio
 * files, no borrowed ringtones. Browsers only allow sound after a user
 * gesture, so unlock() must be called from a click/tap handler.
 */

export type SoundName = "message" | "poke" | "drop" | "startup" | "ghost" | "send" | "badge";

type Note = [freq: number, beats: number];

const N = (semitonesFromA4: number) => 440 * Math.pow(2, semitonesFromA4 / 12);
// Handy pitches
const C5 = N(3), D5 = N(5), E5 = N(7), G5 = N(10), A5 = N(12), B5 = N(14);
const C6 = N(15), D6 = N(17), E6 = N(19), G6 = N(22), A6 = N(24), C7 = N(27);
const REST = 0;

const SONGS: Record<SoundName, { notes: Note[]; tempo: number; wave: OscillatorType; gain: number }> = {
  // two-tone "bip-bip" with a hop at the end
  message: { notes: [[E6, 1], [REST, 0.5], [E6, 1], [G6, 2]], tempo: 0.055, wave: "square", gain: 0.5 },
  // bouncy arpeggio
  poke: { notes: [[C6, 1], [E6, 1], [G6, 1], [C7, 2]], tempo: 0.045, wave: "square", gain: 0.45 },
  // falling "something landed nearby"
  drop: { notes: [[A6, 1], [E6, 1], [C6, 1], [A5, 1], [REST, 1], [E5, 1], [A5, 3]], tempo: 0.06, wave: "triangle", gain: 0.7 },
  // power-on jingle
  startup: { notes: [[C5, 1], [E5, 1], [G5, 1], [C6, 2], [REST, 1], [B5, 1], [D6, 3]], tempo: 0.07, wave: "square", gain: 0.4 },
  // spooky wobble
  ghost: { notes: [[D6, 2], [A5, 2], [D5, 4]], tempo: 0.08, wave: "triangle", gain: 0.6 },
  // tiny confirm blip
  send: { notes: [[A6, 1]], tempo: 0.04, wave: "square", gain: 0.25 },
  // fanfare
  badge: { notes: [[G5, 1], [C6, 1], [E6, 1], [G6, 2], [E6, 1], [G6, 4]], tempo: 0.07, wave: "square", gain: 0.45 },
};

class ChipSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = false;
  volume = 0.6;

  get unlocked(): boolean {
    return !!this.ctx && this.ctx.state === "running";
  }

  /** Must run inside a user gesture. */
  async unlock(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return false;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume * 0.35;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state !== "running") await this.ctx.resume();
      return this.ctx.state === "running";
    } catch {
      return false;
    }
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume * 0.35, this.ctx.currentTime, 0.02);
  }

  /** Plays a sound if allowed; returns false when it could not be heard. */
  play(name: SoundName, force = false): boolean {
    if ((!this.enabled && !force) || !this.ctx || !this.master || this.ctx.state !== "running") return false;
    const song = SONGS[name];
    let t = this.ctx.currentTime + 0.01;
    for (const [freq, beats] of song.notes) {
      const dur = beats * song.tempo;
      if (freq > 0) {
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        osc.type = song.wave;
        osc.frequency.setValueAtTime(freq, t);
        if (name === "ghost") osc.frequency.linearRampToValueAtTime(freq * 0.97, t + dur);
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(song.gain, t + 0.005);
        env.gain.setValueAtTime(song.gain, t + dur * 0.7);
        env.gain.linearRampToValueAtTime(0, t + dur);
        osc.connect(env).connect(this.master);
        osc.start(t);
        osc.stop(t + dur + 0.02);
      }
      t += dur;
    }
    return true;
  }

  vibrate(pattern: number | number[]) {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* not supported (e.g. iOS Safari) */
    }
  }
}

export const synth = new ChipSynth();
