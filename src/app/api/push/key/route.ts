import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { vapidPublicKey } from "@/lib/push-server";

export const dynamic = "force-dynamic";

/** The public key browsers need to subscribe to notifications. Signed-in users only. */
export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const key = await vapidPublicKey();
  return NextResponse.json({ key }, { headers: { "Cache-Control": "no-store" } });
}
