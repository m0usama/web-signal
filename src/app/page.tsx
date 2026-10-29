import { redirect } from "next/navigation";
import { ClientApp } from "@/components/ClientApp";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Bootstrap, Profile, RoomMember, Settings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profiles }, { data: members }, { data: settings }, { data: rooms }] = await Promise.all([
    supabase.from("profiles").select("id,display_name,avatar_key,map_x,map_y,last_seen_at"),
    supabase.from("room_members").select("room_id,user_id,last_read_at"),
    supabase.from("user_settings").select("user_id,sound_on,volume,theme,reduced_fx").eq("user_id", user.id).maybeSingle(),
    supabase.from("private_rooms").select("id,created_at").limit(1),
  ]);

  const me = (profiles as Profile[] | null)?.find((p) => p.id === user.id);
  const partner = (profiles as Profile[] | null)?.find((p) => p.id !== user.id);
  const room = rooms?.[0];

  if (!me || !partner || !room) {
    return (
      <main className="center-screen">
        <div className="card">
          <p className="lcd">NO SIGNAL PAIRED</p>
          <p>
            This account isn&apos;t linked to a WEB//SIGNAL room yet. The owner needs to run <code>setup_pair</code> in Supabase
            (see the README).
          </p>
          <form action="/auth/signout" method="post">
            <button className="btn btn-ghost" type="submit">
              SIGN OUT
            </button>
          </form>
        </div>
      </main>
    );
  }

  const boot: Bootstrap = {
    roomId: room.id,
    roomCreatedAt: room.created_at,
    me,
    partner,
    members: (members as RoomMember[]) ?? [],
    settings: (settings as Settings | null) ?? { user_id: user.id, sound_on: true, volume: 0.6, theme: "auto", reduced_fx: false },
  };

  return <ClientApp boot={boot} />;
}
