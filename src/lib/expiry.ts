import type { Message, SignalDrop } from "./types";

type Expiring = Pick<Message, "mode" | "expires_at" | "opened_at" | "ghost_seconds">;

/** Mirrors public.signal_is_live() in the database. The server is the authority. */
export function isLive(item: Expiring | Pick<SignalDrop, "mode" | "expires_at" | "opened_at" | "ghost_seconds">, now = Date.now()): boolean {
  if (item.expires_at && Date.parse(item.expires_at) <= now) return false;
  if (item.mode === "ghost" && item.opened_at) {
    return Date.parse(item.opened_at) + item.ghost_seconds * 1000 > now;
  }
  return true;
}

/** Milliseconds until the item stops being visible, or null if it never expires. */
export function msLeft(item: Expiring, now = Date.now()): number | null {
  const ends: number[] = [];
  if (item.expires_at) ends.push(Date.parse(item.expires_at));
  if (item.mode === "ghost" && item.opened_at) {
    ends.push(Date.parse(item.opened_at) + item.ghost_seconds * 1000);
  }
  if (ends.length === 0) return null;
  return Math.max(0, Math.min(...ends) - now);
}

export function formatLeft(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, "0")}m`;
}

export function formatLastSeen(iso: string | null, now = Date.now()): string {
  if (!iso) return "NEVER";
  const diff = Math.max(0, now - Date.parse(iso));
  const m = Math.floor(diff / 60000);
  if (m < 1) return "JUST NOW";
  if (m < 60) return `${m}M AGO`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}H AGO`;
  return `${Math.floor(h / 24)}D AGO`;
}
