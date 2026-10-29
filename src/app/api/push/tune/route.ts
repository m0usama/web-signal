import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { notifyPartner } from "@/lib/push-server";

export const dynamic = "force-dynamic";

const lastSent = new Map<string, number>();

/** "I played our tune but you weren't there" — sent by the signed-in user. */
export async function POST() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const now = Date.now();
  if (now - (lastSent.get(user.id) ?? 0) < 30_000) return NextResponse.json({ sent: 0, skipped: "too soon" });
  lastSent.set(user.id, now);

  const { data: member } = await supabase.from("room_members").select("room_id").eq("user_id", user.id).maybeSingle();
  if (!member) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  return NextResponse.json(await notifyPartner({ type: "tune", room_id: member.room_id as string, from: user.id }));
}
