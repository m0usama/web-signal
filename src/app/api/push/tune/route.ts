import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { notifyPartner } from "@/lib/push-server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const lastSent = new Map<string, number>();

/** "I played our tune but you weren't there" — sent by the signed-in user to the person in `room_id`. */
export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let roomId = "";
  try {
    const body = (await request.json()) as { room_id?: unknown };
    roomId = typeof body.room_id === "string" ? body.room_id : "";
  } catch {
    /* no body: fall back to the first room */
  }

  // Row-level security: this only finds rooms the user is a member of.
  let query = supabase.from("room_members").select("room_id").eq("user_id", user.id);
  if (UUID.test(roomId)) query = query.eq("room_id", roomId);
  const { data: rows } = await query.limit(1);
  const member = rows?.[0];
  if (!member) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const key = `${user.id}:${member.room_id}`;
  const now = Date.now();
  if (now - (lastSent.get(key) ?? 0) < 30_000) return NextResponse.json({ sent: 0, skipped: "too soon" });
  lastSent.set(key, now);

  return NextResponse.json(await notifyPartner({ type: "tune", room_id: member.room_id as string, from: user.id }));
}
