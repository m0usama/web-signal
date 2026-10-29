import { redirect } from "next/navigation";
import { ClientApp } from "@/components/ClientApp";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Bootstrap, Contact, Profile, RoomMember, Settings } from "@/lib/types";

export const dynamic = "force-dynamic";

const PROFILE_FIELDS = "id,display_name,avatar_key,map_x,map_y,last_seen_at,foreground,mood,mood_at";

export default async function Home() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Row-level security limits every query to the rooms this person is in.
  const [{ data: profiles }, { data: members }, { data: settings }, { data: rooms }] = await Promise.all([
    supabase.from("profiles").select(PROFILE_FIELDS),
    supabase.from("room_members").select("room_id,user_id,last_read_at"),
    supabase.from("user_settings").select("user_id,sound_on,volume,theme,reduced_fx").eq("user_id", user.id).maybeSingle(),
    supabase.from("private_rooms").select("id,created_at,next_meet_at,next_meet_label,chat_only").order("created_at", { ascending: true }),
  ]);

  const people = (profiles as Profile[] | null) ?? [];
  const allMembers = (members as RoomMember[] | null) ?? [];
  const me = people.find((p) => p.id === user.id);

  const contacts: Contact[] = [];
  for (const room of rooms ?? []) {
    const other = allMembers.find((m) => m.room_id === room.id && m.user_id !== user.id);
    const partner = other && people.find((p) => p.id === other.user_id);
    if (!partner) continue;
    contacts.push({
      roomId: room.id,
      roomCreatedAt: room.created_at,
      countdown: { at: room.next_meet_at ?? null, label: room.next_meet_label ?? null },
      partner,
      unread: 0,
      chatOnly: !!room.chat_only,
    });
  }

  // Unread signals per person (since you last read that chat).
  await Promise.all(
    contacts.map(async (c) => {
      const mine = allMembers.find((m) => m.room_id === c.roomId && m.user_id === user.id);
      if (!mine) return;
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("room_id", c.roomId)
        .neq("sender_id", user.id)
        .gt("created_at", mine.last_read_at);
      c.unread = count ?? 0;
    }),
  );

  const first = contacts[0];
  if (!me || !first) {
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
    roomId: first.roomId,
    roomCreatedAt: first.roomCreatedAt,
    countdown: first.countdown,
    me,
    partner: first.partner,
    members: allMembers.filter((m) => m.room_id === first.roomId),
    contacts,
    chatOnly: first.chatOnly,
    settings: (settings as Settings | null) ?? { user_id: user.id, sound_on: true, volume: 0.6, theme: "auto", reduced_fx: false },
  };

  return <ClientApp boot={boot} allMembers={allMembers} />;
}
