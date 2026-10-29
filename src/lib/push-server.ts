import "server-only";
import webpush from "web-push";
import { getAdminSupabase } from "./supabase/admin";
import { pushText, type PushEvent } from "./push-text";

let configured = false;

/**
 * VAPID keys: from env vars if set, otherwise from the database (private
 * schema). If neither exists yet, a pair is generated once and stored, so
 * the keys never have to be copied around by hand.
 */
async function configure(): Promise<boolean> {
  if (configured) return true;
  let pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  let priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    const admin = getAdminSupabase();
    const read = async () => {
      const { data } = await admin.rpc("push_vapid_keys");
      const row = (Array.isArray(data) ? data[0] : data) as { public_key?: string; private_key?: string } | null;
      return row?.public_key && row.private_key ? row : null;
    };
    let keys = await read();
    if (!keys) {
      const fresh = webpush.generateVAPIDKeys();
      await admin.rpc("push_save_vapid_keys", { p_public: fresh.publicKey, p_private: fresh.privateKey });
      keys = await read();
    }
    if (!keys) return false;
    pub = keys.public_key!;
    priv = keys.private_key!;
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://web-signal-dun.vercel.app", pub, priv);
  configured = true;
  return true;
}

/** Public key browsers subscribe with (creates the key pair on first use). */
export async function vapidPublicKey(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!(await configure())) return null;
  const { data } = await getAdminSupabase().rpc("push_public_key");
  return (data as string | null) ?? null;
}

/**
 * Sends a notification about `event` (made by `fromUserId`) to the other
 * person in the room. Skipped while they have the app open on screen.
 */
export async function notifyPartner(event: PushEvent & { room_id: string; from: string }): Promise<{ sent: number; skipped?: string }> {
  if (!(await configure())) return { sent: 0, skipped: "not configured" };
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
    recipient?.foreground && recipient.last_seen_at && Date.now() - Date.parse(recipient.last_seen_at as string) < 60_000;
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
