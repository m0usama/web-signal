"use client";

import { useSyncExternalStore } from "react";

/**
 * Which hero look belongs to which avatar key, so every round avatar in the
 * app can show the person's hero head without threading props everywhere.
 */
let looks: Record<string, unknown> = {};
const subs = new Set<() => void>();

export function setAvatarLooks(next: Record<string, unknown>) {
  const keys = new Set([...Object.keys(looks), ...Object.keys(next)]);
  let changed = false;
  for (const k of keys) if (JSON.stringify(looks[k] ?? null) !== JSON.stringify(next[k] ?? null)) changed = true;
  if (!changed) return;
  looks = { ...looks, ...next };
  subs.forEach((f) => f());
}

export function useAvatarLook(avatarKey: string): unknown {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => looks[avatarKey] ?? null,
    () => null,
  );
}
