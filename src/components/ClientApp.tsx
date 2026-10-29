"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { synth } from "@/lib/sound";
import type { Bootstrap, Contact, Message, Poke, Profile, RoomMember, Tab } from "@/lib/types";
import { Avatar } from "./Avatar";

/** The game UI depends on window size, storage and audio, so it renders in the browser only. */
const SignalApp = dynamic(() => import("./SignalApp").then((m) => m.SignalApp), {
  ssr: false,
  loading: () => (
    <div className="boot-screen">
      <p className="lcd lcd-blink">BOOTING…</p>
    </div>
  ),
});

interface Ping {
  roomId: string;
  name: string;
  avatar: Profile["avatar_key"];
  text: string;
}

/**
 * Holds the list of people you can talk to. The open chat runs in
 * <SignalApp> (one room at a time); this keeps an eye on the other chats so
 * new signals there show up as a badge and a tap-to-open banner.
 */
export function ClientApp({ boot, allMembers = [] }: { boot: Bootstrap; allMembers?: RoomMember[] }) {
  const initialContacts = useMemo(() => boot.contacts ?? [], [boot.contacts]);
  const [active, setActive] = useState<{ roomId: string; tab: Tab }>({ roomId: boot.roomId, tab: "map" });
  const [partners, setPartners] = useState<Record<string, Profile>>(() =>
    Object.fromEntries(initialContacts.map((c) => [c.partner.id, c.partner])),
  );
  const [unread, setUnread] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialContacts.map((c) => [c.roomId, c.roomId === boot.roomId ? 0 : c.unread])),
  );
  const [ping, setPing] = useState<Ping | null>(null);
  const activeRef = useRef(active.roomId);
  const pingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const multi = initialContacts.length > 1;

  useEffect(() => {
    activeRef.current = active.roomId;
  }, [active.roomId]);

  const partnersRef = useRef(partners);
  useEffect(() => {
    partnersRef.current = partners;
  }, [partners]);

  const contacts: Contact[] = useMemo(
    () =>
      initialContacts.map((c) => ({
        ...c,
        partner: partners[c.partner.id] ?? c.partner,
        unread: c.roomId === active.roomId ? 0 : (unread[c.roomId] ?? 0),
      })),
    [initialContacts, partners, unread, active.roomId],
  );

  /** Re-counts unread signals in the chats that aren't open. */
  const refreshUnread = useCallback(async () => {
    if (!multi) return;
    const supabase = getBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: mine } = await supabase.from("room_members").select("room_id,last_read_at").eq("user_id", user.id);
    const counts = await Promise.all(
      (mine ?? [])
        .filter((m) => m.room_id !== activeRef.current)
        .map(async (m) => {
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("room_id", m.room_id)
            .neq("sender_id", user.id)
            .gt("created_at", m.last_read_at);
          return [m.room_id as string, count ?? 0] as const;
        }),
    );
    setUnread((u) => ({ ...u, ...Object.fromEntries(counts), [activeRef.current]: 0 }));
  }, [multi]);

  // Watch the other chats (row-level security only delivers rows from your own rooms).
  useEffect(() => {
    if (!multi) return;
    const supabase = getBrowserSupabase();
    const nameFor = (roomId: string) => {
      const c = initialContacts.find((x) => x.roomId === roomId);
      return c ? (partnersRef.current[c.partner.id] ?? c.partner) : null;
    };
    const notify = (roomId: string, text: string) => {
      const who = nameFor(roomId);
      if (!who) return;
      setPing({ roomId, name: who.display_name, avatar: who.avatar_key, text });
      synth.play("message");
      if (pingTimer.current) clearTimeout(pingTimer.current);
      pingTimer.current = setTimeout(() => setPing(null), 6000);
    };
    const channel = supabase
      .channel(`lobby:${boot.me.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const row = payload.new as Message;
        if (row.sender_id === boot.me.id || row.room_id === activeRef.current) return;
        if (!initialContacts.some((c) => c.roomId === row.room_id)) return;
        setUnread((u) => ({ ...u, [row.room_id]: (u[row.room_id] ?? 0) + 1 }));
        notify(row.room_id, row.mode === "ghost" ? "sent a ghost signal 👻" : row.kind === "voice" ? "sent a voice signal 📻" : "sent you a signal");
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pokes" }, (payload) => {
        const row = payload.new as Poke;
        if (row.sender_id === boot.me.id || row.room_id === activeRef.current) return;
        notify(row.room_id, "poked you!");
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const row = payload.new as Profile;
        if (row.id === boot.me.id) return;
        setPartners((p) => (p[row.id] ? { ...p, [row.id]: { ...p[row.id], ...row } } : p));
      })
      .subscribe();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshUnread();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (pingTimer.current) clearTimeout(pingTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [multi, boot.me.id, initialContacts, refreshUnread]);

  const switchTo = useCallback(
    (roomId: string, tab: Tab) => {
      if (roomId === activeRef.current) return;
      activeRef.current = roomId;
      setActive({ roomId, tab });
      setUnread((u) => ({ ...u, [roomId]: 0 }));
      setPing((p) => (p?.roomId === roomId ? null : p));
      // The chat we just left may still have unread signals.
      setTimeout(() => void refreshUnread(), 800);
    },
    [refreshUnread],
  );

  const current = contacts.find((c) => c.roomId === active.roomId) ?? contacts[0];
  const roomBoot: Bootstrap = current
    ? {
        ...boot,
        roomId: current.roomId,
        roomCreatedAt: current.roomCreatedAt,
        countdown: current.countdown,
        partner: current.partner,
        members: current.roomId === boot.roomId ? boot.members : allMembers.filter((m) => m.room_id === current.roomId),
        initialTab: active.tab,
        chatOnly: current.chatOnly,
      }
    : boot;

  return (
    <>
      <SignalApp key={roomBoot.roomId} boot={roomBoot} contacts={contacts} onSwitch={switchTo} />
      {ping && (
        <button type="button" className="lobby-toast" onClick={() => switchTo(ping.roomId, "comms")} aria-live="polite">
          <Avatar avatarKey={ping.avatar} size={28} />
          <span>
            <b>{ping.name}</b> {ping.text}
          </span>
        </button>
      )}
    </>
  );
}
