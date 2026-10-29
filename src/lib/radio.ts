"use client";

import { synth } from "./sound";

/**
 * Plays voice notes through a walkie-talkie effect: narrow radio band,
 * light distortion, a hiss bed, a "kssht" squelch at the start and a
 * roger-beep at the end (Web Audio API).
 *
 * iPhone Safari only lets an <audio> element play if it was started from a
 * tap, so one shared element is "primed" on the first tap and reused.
 */

export interface RadioHandle {
  stop: () => void;
}

interface Rig {
  audio: HTMLAudioElement;
  ctx: AudioContext | null;
}

let rig: Rig | null = null;
let current: { stop: () => void } | null = null;
let silentUrl: string | null = null;

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function distortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

/** A tiny silent WAV used to unlock the audio element on iOS. */
function silence(): string {
  if (silentUrl) return silentUrl;
  const samples = 800;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true);
  v.setUint32(28, 16000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, samples * 2, true);
  silentUrl = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  return silentUrl;
}

function getRig(): Rig {
  if (rig) return rig;
  void synth.unlock(); // creates/resumes the shared AudioContext (synchronously starts)
  const audio = new Audio();
  audio.crossOrigin = "anonymous";
  audio.preload = "auto";
  (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
  const ctx = synth.context;
  if (ctx) {
    try {
      const source = ctx.createMediaElementSource(audio);
      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 380;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 3100;
      const shaper = ctx.createWaveShaper();
      shaper.curve = distortionCurve(6);
      shaper.oversample = "2x";
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -24;
      comp.ratio.value = 6;
      const out = ctx.createGain();
      out.gain.value = 0.95;
      source.connect(highpass).connect(lowpass).connect(shaper).connect(comp).connect(out).connect(ctx.destination);
    } catch {
      /* plain playback without the effect */
    }
  }
  rig = { audio, ctx };
  return rig;
}

/** Call from a tap handler (before any await) so later playback is allowed. */
export function primeRadio() {
  const r = getRig();
  if (r.audio.src && !r.audio.paused) return;
  r.audio.src = silence();
  void r.audio.play().catch(() => {});
}

/** Short burst of static, like keying a radio. */
export function squelch(ctx: AudioContext, out: AudioNode, at: number, length = 0.14, level = 0.22) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, length);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2400;
  band.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(level, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, at + length);
  src.connect(band).connect(g).connect(out);
  src.start(at);
  src.stop(at + length + 0.02);
}

/** Two-tone "over" beep. */
export function rogerBeep(ctx: AudioContext, out: AudioNode, at: number) {
  [
    [1200, 0],
    [900, 0.07],
  ].forEach(([f, offset]) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = f;
    g.gain.setValueAtTime(0, at + offset);
    g.gain.linearRampToValueAtTime(0.08, at + offset + 0.005);
    g.gain.setValueAtTime(0.08, at + offset + 0.06);
    g.gain.linearRampToValueAtTime(0, at + offset + 0.07);
    o.connect(g).connect(out);
    o.start(at + offset);
    o.stop(at + offset + 0.08);
  });
}

/** The squelch you hear when you press the talk button. */
export function keyUpSound() {
  void synth.unlock();
  const ctx = synth.context;
  if (!ctx) return;
  try {
    squelch(ctx, ctx.destination, ctx.currentTime + 0.01, 0.1, 0.12);
  } catch {
    /* ignore */
  }
}

/**
 * Plays `url` once through the radio. Start it straight from a tap, or after
 * primeRadio() was called from one. `onProgress` gets 0..1.
 */
export function playRadio(
  url: string,
  { onEnd, onProgress, onError }: { onEnd: () => void; onProgress?: (p: number) => void; onError?: () => void },
): RadioHandle {
  current?.stop();
  const { audio, ctx } = getRig();
  let finished = false;
  let hiss: AudioBufferSourceNode | null = null;

  const cleanup = () => {
    audio.removeEventListener("timeupdate", onTime);
    audio.removeEventListener("ended", onEnded);
    audio.removeEventListener("error", onErr);
    try {
      hiss?.stop();
    } catch {
      /* already stopped */
    }
    if (current === handle) current = null;
  };
  const finish = () => {
    if (finished) return;
    finished = true;
    audio.pause();
    cleanup();
    if (ctx) {
      try {
        rogerBeep(ctx, ctx.destination, ctx.currentTime + 0.02);
        squelch(ctx, ctx.destination, ctx.currentTime + 0.18, 0.12, 0.15);
      } catch {
        /* ignore */
      }
    }
    onEnd();
  };
  const onTime = () => {
    if (audio.duration && Number.isFinite(audio.duration)) onProgress?.(audio.currentTime / audio.duration);
  };
  const onEnded = () => finish();
  const onErr = () => {
    if (finished) return;
    finished = true;
    cleanup();
    onError?.();
  };

  audio.addEventListener("timeupdate", onTime);
  audio.addEventListener("ended", onEnded);
  audio.addEventListener("error", onErr);

  if (ctx) {
    try {
      squelch(ctx, ctx.destination, ctx.currentTime);
      hiss = ctx.createBufferSource();
      hiss.buffer = noiseBuffer(ctx, 2);
      hiss.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 3000;
      band.Q.value = 0.6;
      const g = ctx.createGain();
      g.gain.value = 0.018;
      hiss.connect(band).connect(g).connect(ctx.destination);
      hiss.start(ctx.currentTime + 0.1);
    } catch {
      /* ignore */
    }
  }

  audio.src = url;
  audio.currentTime = 0;
  void audio.play().catch(onErr);

  const handle: RadioHandle = { stop: finish };
  current = handle;
  return handle;
}
