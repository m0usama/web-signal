"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export type RemoteTuneResult = "started" | "blocked" | "busy" | "no-answer";

/**
 * Plays the tune for someone in a chat that isn't open right now: joins that
 * chat's live channel briefly, sends the tune, waits up to 10s for the other
 * phone to answer, then leaves. Falls back to a notification if nobody answers.
 */
export function playTuneInOtherRoom(
  supabase: SupabaseClient,
  roomId: string,
  meId: string,
  partnerId: string,
  onUpdate: (state: "started" | "ended", durationS?: number) => void,
): Promise<RemoteTuneResult> {
  return new Promise((resolve) => {
    const id = crypto.randomUUID();
    let settled = false;
    let leaveTimer: ReturnType<typeof setTimeout> | null = null;
    const ch = supabase.channel(`room:${roomId}`, { config: { private: true } });
    const leave = () => {
      if (leaveTimer) clearTimeout(leaveTimer);
      void supabase.removeChannel(ch);
    };
    const finish = (r: RemoteTuneResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(noAnswer);
      if (r !== "started") leave();
      resolve(r);
    };
    const noAnswer = setTimeout(() => {
      finish("no-answer");
      void fetch("/api/push/tune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: roomId }),
      }).catch(() => {});
    }, 10_000);

    ch.on("broadcast", { event: "tune-ack" }, ({ payload }) => {
      if (payload?.from !== partnerId || payload.id !== id) return;
      const state = payload.state as string;
      if (state === "started") {
        const duration = typeof payload.duration === "number" ? payload.duration : 30;
        onUpdate("started", duration);
        finish("started");
        // Stay a little longer to hear "ended", then leave regardless.
        leaveTimer = setTimeout(() => {
          onUpdate("ended");
          leave();
        }, (duration + 3) * 1000);
      } else if (state === "ended") {
        onUpdate("ended");
        leave();
      } else finish(state === "busy" ? "busy" : "blocked");
    }).subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void ch.send({ type: "broadcast", event: "tune", payload: { id, from: meId } });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        finish("no-answer");
      }
    });
  });
}
