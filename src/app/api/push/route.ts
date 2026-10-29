import { NextResponse } from "next/server";
import { notifyPartner, notifyRoomDaily } from "@/lib/push-server";
import { sparkDay } from "@/lib/spark";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { PushEvent } from "@/lib/push-text";

export const dynamic = "force-dynamic";

const TYPES = new Set(["messages", "pokes", "signal_drops", "spark_answers", "games", "daily_answers", "race_runs", "daily"]);
const UUID = /^[0-9a-f-]{36}$/i;

/** Called by the database (pg_net) after inserts. Authenticated by a shared secret. */
export async function POST(request: Request) {
  const given = request.headers.get("x-push-secret") ?? "";
  const envSecret = process.env.PUSH_WEBHOOK_SECRET;
  let ok = false;
  if (given.length >= 32) {
    if (envSecret) ok = given === envSecret;
    else {
      // The secret is generated and kept in the database (private schema).
      const { data } = await getAdminSupabase().rpc("push_check_secret", { p_secret: given });
      ok = data === true;
    }
  }
  if (!ok) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const type = String(body.type ?? "");
  const room_id = String(body.room_id ?? "");
  const from = String(body.from ?? "");
  if (type === "daily" && UUID.test(room_id)) {
    return NextResponse.json(await notifyRoomDaily(room_id, sparkDay()));
  }
  if (!TYPES.has(type) || !UUID.test(room_id) || !UUID.test(from)) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const result = await notifyPartner({
    type: type as PushEvent["type"],
    room_id,
    from,
    kind: (body.kind as string) ?? null,
    mode: (body.mode as string) ?? null,
    winner: (body.winner as string) ?? null,
  });
  return NextResponse.json(result);
}
