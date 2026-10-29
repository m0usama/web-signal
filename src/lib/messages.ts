import type { Message } from "./types";

/**
 * Merges a message into the list. Handles realtime echoes of our own
 * optimistic sends (matched by client_id) and duplicate deliveries.
 */
export function upsertMessage(list: Message[], incoming: Message): Message[] {
  const idx = list.findIndex(
    (m) => m.id === incoming.id || (m.client_id === incoming.client_id && m.sender_id === incoming.sender_id),
  );
  let next: Message[];
  if (idx === -1) {
    next = [...list, incoming];
  } else {
    const prev = list[idx];
    const merged: Message = { ...prev, ...incoming, _status: undefined };
    if (prev._localPreview && !incoming._localPreview) merged._localPreview = prev._localPreview;
    next = list.slice();
    next[idx] = merged;
  }
  return sortMessages(next);
}

export function removeMessage(list: Message[], id: string): Message[] {
  return list.filter((m) => m.id !== id);
}

export function sortMessages(list: Message[]): Message[] {
  return list.slice().sort((a, b) => {
    const d = Date.parse(a.created_at) - Date.parse(b.created_at);
    return d !== 0 ? d : a.id.localeCompare(b.id);
  });
}

/** True when the partner has read up to (and including) this message. */
export function isSeenBy(message: Message, partnerLastReadAt: string | undefined): boolean {
  if (!partnerLastReadAt) return false;
  return Date.parse(partnerLastReadAt) >= Date.parse(message.created_at);
}

export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : String(err);
  if (msg.includes("RATE_LIMIT")) return "WHOA, SLOW DOWN HERO — TRY AGAIN IN A MINUTE";
  if (msg.includes("EXPIRED")) return "THIS SIGNAL HAS FADED AWAY";
  if (msg.includes("GHOST_SENDER")) return "GHOSTS ONLY APPEAR TO THE RECEIVER";
  if (msg.includes("MEDIA_NOT_FOUND")) return "UPLOAD DIDN'T LAND — TRY AGAIN";
  if (msg.toLowerCase().includes("payload too large") || msg.includes("exceeded the maximum")) return "FILE TOO BIG (MAX 8 MB)";
  if (msg.toLowerCase().includes("mime")) return "ONLY PNG, JPG, WEBP OR GIF";
  if (msg.toLowerCase().includes("fetch")) return "SIGNAL LOST — CHECK YOUR CONNECTION";
  return "SOMETHING GLITCHED — TRY AGAIN";
}
