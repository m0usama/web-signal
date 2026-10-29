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

  // Prefer "tune.mp3", otherwise use the newest audio file in the bucket,
  // so the exact file name you upload doesn't matter.
  const bucket = getAdminSupabase().storage.from("signal-tunes");
  const { data: files } = await bucket.list("", { limit: 50, sortBy: { column: "created_at", order: "desc" } });
  const audio = (files ?? []).filter((f) => f.id && /\.(mp3|m4a|aac|wav|ogg)$/i.test(f.name));
  const pick = audio.find((f) => f.name === "tune.mp3") ?? audio[0];
  if (!pick) return NextResponse.json({ url: null }, { headers: { "Cache-Control": "no-store" } });

  const { data, error } = await bucket.createSignedUrl(pick.name, 300);
  if (error || !data) return NextResponse.json({ url: null }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ url: data.signedUrl }, { headers: { "Cache-Control": "no-store" } });
}
