"use client";

import { useSyncExternalStore } from "react";

/** How long (ms) without a touch before the hero swings down. 0 = never. */
export const IDLE_CHOICES = [
  { ms: 0, label: "OFF" },
  { ms: 30_000, label: "30 SEC" },
  { ms: 60_000, label: "1 MIN" },
  { ms: 120_000, label: "2 MIN" },
  { ms: 300_000, label: "5 MIN" },
  { ms: 600_000, label: "10 MIN" },
] as const;
export const DEFAULT_IDLE_MS = 60_000;

const KEY = "ws-hero-idle-ms";
const subs = new Set<() => void>();

function read(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    if (localStorage.getItem(KEY) !== null && IDLE_CHOICES.some((c) => c.ms === v)) return v;
  } catch {
    // storage blocked: use the default
  }
  return DEFAULT_IDLE_MS;
}

let current: number | null = null;

export function setIdleMs(ms: number) {
  current = ms;
  try {
    localStorage.setItem(KEY, String(ms));
  } catch {
    // keep it for this session only
  }
  subs.forEach((f) => f());
}

export function useIdleMs(): number {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => (current ??= read()),
    () => DEFAULT_IDLE_MS,
  );
}

/** Ask the hero to swing down right now (the "show me" button). */
export const HERO_DEMO_EVENT = "ws-hero-demo";
