import { NextResponse } from "next/server";
import { notifyPartner } from "@/lib/push-server";
import type { PushEvent } from "@/lib/push-text";

export const dynamic = "force-dynamic";

const TYPES = new Set(["messages", "pokes", "signal_drops", "spark_answers", "games"]);
const UUID = /^[0-9a-f-]{36}$/i;

/** Called by the database (pg_net) after inserts. Authenticated by a shared secret. */
export async function POST(request: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-push-secret") !== secret) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const type = String(body.type ?? "");
  const room_id = String(body.room_id ?? "");
  const from = String(body.from ?? "");
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
