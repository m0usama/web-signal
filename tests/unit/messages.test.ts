import { describe, expect, it } from "vitest";
import { friendlyError, isSeenBy, removeMessage, upsertMessage } from "@/lib/messages";
import type { Message } from "@/lib/types";

const m = (over: Partial<Message>): Message => ({
  id: "1", room_id: "r", sender_id: "a", client_id: "c1", kind: "text", body: "hi", sticker: null, media_path: null,
  mode: "normal", ghost_seconds: 10, expires_at: null, opened_at: null, created_at: "2026-10-29T12:00:00Z", ...over,
});

describe("message list", () => {
  it("replaces an optimistic message with the server echo (same client_id)", () => {
    const list = [m({ id: "local-c1", _status: "sending", _localPreview: "blob:x" })];
    const next = upsertMessage(list, m({ id: "real-1" }));
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe("real-1");
    expect(next[0]._status).toBeUndefined();
    expect(next[0]._localPreview).toBe("blob:x");
  });

  it("ignores duplicate realtime deliveries", () => {
    const once = upsertMessage([], m({ id: "x" }));
    expect(upsertMessage(once, m({ id: "x" }))).toHaveLength(1);
  });

  it("keeps messages in time order", () => {
    const list = upsertMessage([m({ id: "b", client_id: "b", created_at: "2026-10-29T12:05:00Z" })], m({ id: "a", client_id: "a" }));
    expect(list.map((x) => x.id)).toEqual(["a", "b"]);
    expect(removeMessage(list, "a").map((x) => x.id)).toEqual(["b"]);
  });

  it("read receipts", () => {
    expect(isSeenBy(m({}), "2026-10-29T12:00:01Z")).toBe(true);
    expect(isSeenBy(m({}), "2026-10-29T11:59:59Z")).toBe(false);
    expect(isSeenBy(m({}), undefined)).toBe(false);
  });

  it("maps server errors to friendly text", () => {
    expect(friendlyError(new Error("RATE_LIMIT: slow down"))).toMatch(/SLOW DOWN/);
    expect(friendlyError({ message: "EXPIRED" })).toMatch(/FADED/);
  });
});
