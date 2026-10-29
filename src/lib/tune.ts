"use client";

import { synth } from "./sound";

let cached: Promise<AudioBuffer | null> | null = null;

/** Downloads and decodes the private tune once per session (null = use the chiptune). */
export function loadTune(): Promise<AudioBuffer | null> {
  if (!cached) {
    cached = (async () => {
      try {
        const res = await fetch("/api/tune", { cache: "no-store" });
        if (!res.ok) return null;
        const { url } = (await res.json()) as { url: string | null };
        if (!url) return null;
        const audio = await fetch(url);
        if (!audio.ok) return null;
        const bytes = await audio.arrayBuffer();
        const ctx = synth.context;
        if (!ctx) return null;
        return await ctx.decodeAudioData(bytes);
      } catch {
        return null;
      }
    })();
    // Retry next time if it failed (e.g. sound not unlocked yet).
    void cached.then((b) => {
      if (!b) cached = null;
    });
  }
  return cached;
}

/**
 * Plays the tune once. Returns its duration in seconds, or null if this
 * device can't play sound right now. onEnd fires when playback finishes.
 */
export async function playTuneOnce(onEnd: () => void): Promise<number | null> {
  if (!synth.unlocked) return null;
  const buffer = await loadTune();
  if (buffer) return synth.playBuffer(buffer, onEnd);
  const ok = synth.play("tune", true);
  if (!ok) return null;
  const length = synth.lengthOf("tune");
  setTimeout(onEnd, length * 1000 + 100);
  return length;
}
