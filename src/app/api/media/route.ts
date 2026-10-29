import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = "signal-media";
const NORMAL_TTL = 120; // seconds

type OpenRow = {
  id: string;
  kind?: string | null;
  mode: string;
  media_path: string | null;
  opened_at: string | null;
  expires_at: string | null;
  view_until: string | null;
  body?: string | null;
  sticker?: string | null;
  media_kind?: string | null;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function errorStatus(message: string): number {
  if (message.includes("EXPIRED")) return 410;
  if (message.includes("GHOST_SENDER")) return 403;
  if (message.includes("NOT_FOUND")) return 404;
  return 400;
}

/**
 * Issues short-lived signed URLs for private media.
 * Access is decided by security-definer RPCs running AS THE USER
 * (open_message / open_drop), which also record ghost opens. Only after that
 * check passes does the service role sign the URL.
 */
export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "UNAUTHORIZED" }, 401);

  let body: { type?: unknown; id?: unknown; ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "BAD_REQUEST" }, 400);
  }

  const admin = getAdminSupabase();

  // Batch: normal/24h message images in the chat list. Ghosts are never batched.
  if (body.type === "message" && Array.isArray(body.ids)) {
    const ids = body.ids.filter((x): x is string => typeof x === "string" && UUID.test(x)).slice(0, 40);
    if (ids.length === 0) return json({ items: {} });
    const { data: rows, error } = await supabase
      .from("messages")
      .select("id, media_path, mode")
      .in("id", ids)
      .neq("mode", "ghost")
      .not("media_path", "is", null);
    if (error) return json({ error: "QUERY_FAILED" }, 500);
    const paths = (rows ?? []).map((r) => r.media_path as string);
    if (paths.length === 0) return json({ items: {} });
    const { data: signed, error: signErr } = await admin.storage.from(BUCKET).createSignedUrls(paths, NORMAL_TTL);
    if (signErr) return json({ error: "SIGN_FAILED" }, 500);
    const items: Record<string, { url: string }> = {};
    (rows ?? []).forEach((r, i) => {
      const url = signed?.[i]?.signedUrl;
      if (url) items[r.id as string] = { url };
    });
    return json({ items, ttl: NORMAL_TTL });
  }

  if ((body.type !== "message" && body.type !== "drop") || typeof body.id !== "string" || !UUID.test(body.id)) {
    return json({ error: "BAD_REQUEST" }, 400);
  }

  const rpc = body.type === "message" ? "open_message" : "open_drop";
  const { data, error } = await supabase.rpc(rpc, { p_id: body.id });
  if (error) return json({ error: error.message.split(":")[0] }, errorStatus(error.message));
  const row = (Array.isArray(data) ? data[0] : data) as OpenRow | undefined;
  if (!row) return json({ error: "NOT_FOUND" }, 404);

  let url: string | null = null;
  if (row.media_path) {
    // Drop photos are shown for 10 seconds per open, so the link is short-lived too.
    let ttl = body.type === "drop" ? 20 : NORMAL_TTL;
    if (row.mode === "ghost" && row.view_until) {
      const left = Math.ceil((Date.parse(row.view_until) - Date.now()) / 1000);
      if (left <= 0) return json({ error: "EXPIRED" }, 410);
      ttl = Math.min(60, Math.max(3, left + 2));
    }
    const { data: signed, error: signErr } = await admin.storage.from(BUCKET).createSignedUrl(row.media_path, ttl);
    if (signErr || !signed) return json({ error: "SIGN_FAILED" }, 500);
    url = signed.signedUrl;
  }

  return json({
    url,
    mode: row.mode,
    openedAt: row.opened_at,
    viewUntil: row.view_until,
    body: row.body ?? null,
    sticker: row.sticker ?? null,
    mediaKind: row.media_kind ?? null,
    kind: row.kind ?? null,
  });
}
