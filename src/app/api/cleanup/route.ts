import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Daily job (Vercel Cron, see vercel.json). The database already hides and
 * deletes expired rows; this removes their files from Storage.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const admin = getAdminSupabase();
  const { data: swept, error } = await admin.rpc("cleanup_expired");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let removed = 0;
  for (let round = 0; round < 20; round++) {
    const { data: trash, error: trashErr } = await admin.from("media_trash").select("path").limit(100);
    if (trashErr) return NextResponse.json({ error: trashErr.message, swept, removed }, { status: 500 });
    if (!trash || trash.length === 0) break;
    const paths = trash.map((t) => t.path as string);
    const { error: rmErr } = await admin.storage.from("signal-media").remove(paths);
    if (rmErr) return NextResponse.json({ error: rmErr.message, swept, removed }, { status: 500 });
    await admin.from("media_trash").delete().in("path", paths);
    removed += paths.length;
  }

  return NextResponse.json({ ok: true, swept, removed });
}
