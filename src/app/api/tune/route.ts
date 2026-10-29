import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Signed URL for the private shared tune. Room members only. */
export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data: member } = await supabase.from("room_members").select("room_id").eq("user_id", user.id).maybeSingle();
  if (!member) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { data, error } = await getAdminSupabase().storage.from("signal-tunes").createSignedUrl("tune.mp3", 300);
  if (error || !data) return NextResponse.json({ url: null }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ url: data.signedUrl }, { headers: { "Cache-Control": "no-store" } });
}
