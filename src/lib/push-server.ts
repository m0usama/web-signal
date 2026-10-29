import "server-only";
import webpush from "web-push";
import { getAdminSupabase } from "./supabase/admin";
import { pushText, type PushEvent } from "./push-text";

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://web-signal-dun.vercel.app", pub, priv);
  configured = true;
  return true;
}

/**
 * Sends a notification about `event` (made by `fromUserId`) to the other
 * person in the room. Skipped while they have the app open on screen.
 */
export async function notifyPartner(event: PushEvent & { room_id: string; from: string }): Promise<{ sent: number; skipped?: string }> {
  if (!configure()) return { sent: 0, skipped: "not configured" };
  const admin = getAdminSupabase();

  const { data: members } = await admin.from("room_members").select("user_id").eq("room_id", event.room_id);
  const ids = (members ?? []).map((m) => m.user_id as string);
  if (!ids.includes(event.from)) return { sent: 0, skipped: "sender not in room" };
  const to = ids.find((id) => id !== event.from);
  if (!to) return { sent: 0, skipped: "no partner" };

  const { data: people } = await admin.from("profiles").select("id, display_name, foreground, last_seen_at").in("id", [event.from, to]);
  const sender = people?.find((p) => p.id === event.from);
  const recipient = people?.find((p) => p.id === to);
  const activeNow =
    recipient?.foreground && recipient.last_seen_at && Date.now() - Date.parse(recipient.last_seen_at as string) < 90_000;
  if (activeNow && event.type !== "tune") return { sent: 0, skipped: "recipient has the app open" };

  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", to);
  if (!subs?.length) return { sent: 0, skipped: "no devices" };

  const text = pushText(event, (sender?.display_name as string) ?? "WEB//SIGNAL");
  const payload = JSON.stringify({ ...text, url: "/" });
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
          payload,
          { TTL: 60 * 60, urgency: "high", topic: text.tag },
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
      }
    }),
  );
  return { sent };
}
