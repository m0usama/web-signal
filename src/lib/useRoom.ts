"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserSupabase } from "./supabase/client";
import { removeMessage, sortMessages, upsertMessage } from "./messages";
import { isLive } from "./expiry";
import { kindForMime, mediaPath, prepareImage, validateFile, type AllowedMime } from "./upload";
import type {
  Badge,
  Bootstrap,
  Message,
  Poke,
  PokeKind,
  Profile,
  Reaction,
  RoomMember,
  Settings,
  SignalDrop,
  SignalMode,
  Tab,
} from "./types";

export type Connection = "connecting" | "live" | "reconnecting" | "offline";

export interface RoomEvents {
  onMessage?: (m: Message) => void;
  onPoke?: (p: Poke) => void;
  onDrop?: (d: SignalDrop) => void;
  onBadge?: (b: Badge) => void;
  onPartnerArrive?: () => void;
  onDropOpened?: (d: SignalDrop) => void;
  /** Live, not stored: the partner pressed "play tune". */
  onTune?: (p: { id: string; from: string }) => void;
  /** Live, not stored: the partner's device reports what happened to our tune. */
  onTuneAck?: (p: { id: string; state: "started" | "ended" | "blocked" | "busy"; duration?: number }) => void;
}

export interface PartnerPresence {
  online: boolean;
  view: Tab | null;
  typing: boolean;
}

const uuid = () => crypto.randomUUID();

export function useRoom(boot: Bootstrap, events: RoomEvents, currentTab: Tab) {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const roomId = boot.roomId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [pokes, setPokes] = useState<Poke[]>([]);
  const [drops, setDrops] = useState<SignalDrop[]>([]);
  const [me, setMe] = useState<Profile>(boot.me);
  const [partner, setPartner] = useState<Profile>(boot.partner);
  const [members, setMembers] = useState<RoomMember[]>(boot.members);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [settings, setSettings] = useState<Settings>(boot.settings);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [loaded, setLoaded] = useState(false);
  const [presence, setPresence] = useState<PartnerPresence>({ online: false, view: null, typing: false });
  const [mediaUrls, setMediaUrls] = useState<Record<string, { url: string; exp: number }>>({});
  const [generation, setGeneration] = useState(0);

  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  });
  const tabRef = useRef(currentTab);
  const presenceChannel = useRef<RealtimeChannel | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const retries = useRef(0);
  const wasLive = useRef(false);

  // ------------------------------------------------------------ initial + refresh load
  const loadAll = useCallback(async () => {
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const [msgs, reacts, pk, dr, profs, mems, bdg] = await Promise.all([
      supabase.from("messages").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(200),
      supabase.from("message_reactions").select("message_id,user_id,emoji"),
      supabase.from("pokes").select("*").eq("room_id", roomId).gte("created_at", weekAgo).order("created_at", { ascending: false }).limit(60),
      supabase.from("signal_drops").select("*").eq("room_id", roomId).order("created_at", { ascending: true }),
      supabase.from("profiles").select("id,display_name,avatar_key,map_x,map_y,last_seen_at"),
      supabase.from("room_members").select("room_id,user_id,last_read_at").eq("room_id", roomId),
      supabase.from("badges").select("*"),
    ]);
    if (msgs.data) {
      setMessages((prev) => {
        const pending = prev.filter((m) => m._status);
        let next = sortMessages((msgs.data as Message[]).reverse());
        for (const p of pending) if (!next.some((m) => m.client_id === p.client_id)) next = upsertMessage(next, p);
        return next;
      });
    }
    if (reacts.data) setReactions(reacts.data as Reaction[]);
    if (pk.data) setPokes((pk.data as Poke[]).reverse());
    if (dr.data) setDrops(dr.data as SignalDrop[]);
    if (profs.data) {
      for (const p of profs.data as Profile[]) {
        if (p.id === boot.me.id) setMe(p);
        else setPartner(p);
      }
    }
    if (mems.data) setMembers(mems.data as RoomMember[]);
    if (bdg.data) setBadges(bdg.data as Badge[]);
    setLoaded(true);
  }, [supabase, roomId, boot.me.id]);

  // ------------------------------------------------------------ database changes
  useEffect(() => {
    let disposed = false;
    const filter = `room_id=eq.${roomId}`;
    const channel = supabase
      .channel(`db:${roomId}:${generation}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter }, (payload) => {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: string }).id;
          if (id) setMessages((list) => removeMessage(list, id));
          return;
        }
        const row = payload.new as Message;
        setMessages((list) => {
          const isNew = !list.some((m) => m.id === row.id || (m.client_id === row.client_id && m.sender_id === row.sender_id));
          if (isNew && payload.eventType === "INSERT" && row.sender_id !== boot.me.id) {
            queueMicrotask(() => eventsRef.current.onMessage?.(row));
          }
          return upsertMessage(list, row);
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const old = payload.old as Partial<Reaction>;
          setReactions((list) => list.filter((r) => !(r.message_id === old.message_id && r.user_id === old.user_id)));
          return;
        }
        const row = payload.new as Reaction;
        setReactions((list) => [...list.filter((r) => !(r.message_id === row.message_id && r.user_id === row.user_id)), row]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pokes", filter }, (payload) => {
        const row = payload.new as Poke;
        setPokes((list) => (list.some((p) => p.id === row.id) ? list : [...list.slice(-59), row]));
        if (row.sender_id !== boot.me.id) eventsRef.current.onPoke?.(row);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "signal_drops", filter }, (payload) => {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: string }).id;
          if (id) setDrops((list) => list.filter((d) => d.id !== id));
          return;
        }
        const row = payload.new as SignalDrop;
        setDrops((list) => {
          const existing = list.find((d) => d.id === row.id);
          if (!existing && row.sender_id !== boot.me.id) queueMicrotask(() => eventsRef.current.onDrop?.(row));
          if (existing && !existing.opened_at && row.opened_at && row.sender_id === boot.me.id) {
            queueMicrotask(() => eventsRef.current.onDropOpened?.(row));
          }
          return existing ? list.map((d) => (d.id === row.id ? row : d)) : [...list, row];
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "room_members", filter }, (payload) => {
        const row = payload.new as RoomMember;
        setMembers((list) => list.map((m) => (m.user_id === row.user_id ? { ...m, last_read_at: row.last_read_at } : m)));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const row = payload.new as Profile;
        if (row.id === boot.me.id) setMe((p) => ({ ...p, ...row }));
        else setPartner((p) => ({ ...p, ...row }));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "badges" }, (payload) => {
        const row = payload.new as Badge;
        setBadges((list) => (list.some((b) => b.user_id === row.user_id && b.badge_key === row.badge_key) ? list : [...list, row]));
        eventsRef.current.onBadge?.(row);
      })
      .subscribe((status) => {
        if (disposed) return;
        if (status === "SUBSCRIBED") {
          retries.current = 0;
          setConnection(navigator.onLine ? "live" : "offline");
          // Catch anything that happened while we were disconnected.
          void loadAll();
          wasLive.current = true;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnection(navigator.onLine ? "reconnecting" : "offline");
          const delay = Math.min(30_000, 1500 * 2 ** retries.current++);
          setTimeout(() => {
            if (!disposed) setGeneration((g) => g + 1);
          }, delay);
        }
      });

    return () => {
      disposed = true;
      void supabase.removeChannel(channel);
    };
  }, [supabase, roomId, generation, loadAll, boot.me.id]);

  // ------------------------------------------------------------ presence + typing (private channel)
  useEffect(() => {
    let disposed = false;
    let channel: RealtimeChannel | null = null;

    (async () => {
      await supabase.realtime.setAuth();
      if (disposed) return;
      channel = supabase.channel(`room:${roomId}`, {
        config: { private: true, presence: { key: boot.me.id } },
      });
      presenceChannel.current = channel;
      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel!.presenceState<{ view: Tab }>();
          const theirs = state[boot.partner.id]?.[0];
          setPresence((p) => {
            if (!p.online && theirs) queueMicrotask(() => eventsRef.current.onPartnerArrive?.());
            return { online: !!theirs, view: theirs?.view ?? null, typing: theirs ? p.typing : false };
          });
        })
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          if (payload?.user !== boot.partner.id) return;
          setPresence((p) => ({ ...p, typing: !!payload.typing }));
          if (typingTimer.current) clearTimeout(typingTimer.current);
          if (payload.typing) {
            typingTimer.current = setTimeout(() => setPresence((p) => ({ ...p, typing: false })), 4000);
          }
        })
        .on("broadcast", { event: "tune" }, ({ payload }) => {
          if (payload?.from === boot.partner.id && typeof payload.id === "string") eventsRef.current.onTune?.(payload);
        })
        .on("broadcast", { event: "tune-ack" }, ({ payload }) => {
          if (payload?.from === boot.partner.id && typeof payload.id === "string") eventsRef.current.onTuneAck?.(payload);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED" && !disposed) {
            await channel!.track({ view: tabRef.current, at: Date.now() });
          }
        });
    })();

    return () => {
      disposed = true;
      presenceChannel.current = null;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, roomId, boot.me.id, boot.partner.id, generation]);

  // Tell the partner which screen we are on.
  useEffect(() => {
    tabRef.current = currentTab;
    void presenceChannel.current?.track({ view: currentTab, at: Date.now() });
  }, [currentTab]);

  // ------------------------------------------------------------ last seen + online/offline + visibility
  useEffect(() => {
    const touch = () => void supabase.rpc("touch_presence");
    touch();
    const beat = setInterval(() => {
      if (document.visibilityState === "visible") touch();
    }, 60_000);
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        touch();
      } else if (hiddenAt && Date.now() - hiddenAt > 20_000) {
        touch();
        void loadAll();
      }
    };
    const onOnline = () => {
      setConnection("reconnecting");
      setGeneration((g) => g + 1);
    };
    const onOffline = () => setConnection("offline");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("pagehide", touch);
    return () => {
      clearInterval(beat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("pagehide", touch);
    };
  }, [supabase, loadAll]);

  // ------------------------------------------------------------ drop expired items locally (server already hides them)
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setMessages((list) => (list.some((m) => !isLive(m, now)) ? list.filter((m) => isLive(m, now)) : list));
      setDrops((list) => (list.some((d) => !isLive(d, now)) ? list.filter((d) => isLive(d, now)) : list));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ------------------------------------------------------------ actions
  const insertMessage = useCallback(
    async (draft: Omit<Message, "id" | "room_id" | "sender_id" | "created_at" | "expires_at" | "opened_at">) => {
      const optimistic: Message = {
        ...draft,
        id: `local-${draft.client_id}`,
        room_id: roomId,
        sender_id: boot.me.id,
        created_at: new Date().toISOString(),
        expires_at: draft.mode === "normal" ? null : new Date(Date.now() + 864e5).toISOString(),
        opened_at: null,
        _status: "sending",
      };
      setMessages((list) => upsertMessage(list, optimistic));
      const { data, error } = await supabase
        .from("messages")
        .insert({
          room_id: roomId,
          client_id: draft.client_id,
          kind: draft.kind,
          body: draft.body,
          sticker: draft.sticker,
          media_path: draft.media_path,
          mode: draft.mode,
          ghost_seconds: draft.ghost_seconds,
        })
        .select("*")
        .single();
      if (error || !data) {
        setMessages((list) => list.map((m) => (m.client_id === draft.client_id ? { ...m, _status: "failed" } : m)));
        throw error ?? new Error("SEND_FAILED");
      }
      setMessages((list) => upsertMessage(list, data as Message));
      return data as Message;
    },
    [supabase, roomId, boot.me.id],
  );

  const sendText = useCallback(
    (body: string, mode: SignalMode) =>
      insertMessage({
        client_id: uuid(),
        kind: "text",
        body: body.trim().slice(0, 1000),
        sticker: null,
        media_path: null,
        mode: mode === "ghost" ? "day" : mode,
        ghost_seconds: 10,
      }),
    [insertMessage],
  );

  const sendSticker = useCallback(
    (sticker: string, mode: SignalMode) =>
      insertMessage({
        client_id: uuid(),
        kind: "sticker",
        body: null,
        sticker,
        media_path: null,
        mode: mode === "ghost" ? "day" : mode,
        ghost_seconds: 10,
      }),
    [insertMessage],
  );

  const uploadMedia = useCallback(
    async (file: File): Promise<{ path: string; kind: "image" | "gif" }> => {
      const problem = validateFile(file);
      if (problem) throw new Error(problem);
      const blob = await prepareImage(file);
      const mime = (blob.type || file.type) as AllowedMime;
      const problem2 = validateFile({ type: mime, size: blob.size });
      if (problem2) throw new Error(problem2);
      const path = mediaPath(roomId, boot.me.id, mime, uuid());
      const { error } = await supabase.storage
        .from("signal-media")
        .upload(path, blob, { contentType: mime, upsert: false, cacheControl: "0" });
      if (error) throw error;
      return { path, kind: kindForMime(mime) };
    },
    [supabase, roomId, boot.me.id],
  );

  const sendMedia = useCallback(
    async (file: File, mode: SignalMode, ghostSeconds: number) => {
      const clientId = uuid();
      const preview = URL.createObjectURL(file);
      const placeholder: Message = {
        id: `local-${clientId}`,
        room_id: roomId,
        sender_id: boot.me.id,
        client_id: clientId,
        kind: file.type === "image/gif" ? "gif" : "image",
        body: null,
        sticker: null,
        media_path: null,
        mode,
        ghost_seconds: ghostSeconds,
        expires_at: null,
        opened_at: null,
        created_at: new Date().toISOString(),
        _status: "sending",
        _localPreview: mode === "ghost" ? undefined : preview,
      };
      setMessages((list) => upsertMessage(list, placeholder));
      try {
        const { path, kind } = await uploadMedia(file);
        return await insertMessage({
          client_id: clientId,
          kind,
          body: null,
          sticker: null,
          media_path: path,
          mode,
          ghost_seconds: ghostSeconds,
          _localPreview: mode === "ghost" ? undefined : preview,
        });
      } catch (e) {
        setMessages((list) => list.map((m) => (m.client_id === clientId ? { ...m, _status: "failed" } : m)));
        throw e;
      }
    },
    [insertMessage, uploadMedia, roomId, boot.me.id],
  );

  const discardFailed = useCallback((clientId: string) => {
    setMessages((list) => list.filter((m) => m.client_id !== clientId));
  }, []);

  const retry = useCallback(
    async (clientId: string) => {
      const m = messages.find((x) => x.client_id === clientId);
      if (!m || m._status !== "failed") return;
      if ((m.kind === "image" || m.kind === "gif") && !m.media_path) {
        discardFailed(clientId);
        throw new Error("PLEASE PICK THE PHOTO AGAIN");
      }
      setMessages((list) => list.filter((x) => x.client_id !== clientId));
      await insertMessage({ ...m, client_id: clientId });
    },
    [messages, insertMessage, discardFailed],
  );

  const unsend = useCallback(
    async (id: string) => {
      const prev = messages;
      setMessages((list) => removeMessage(list, id));
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) {
        setMessages(prev);
        throw error;
      }
    },
    [supabase, messages],
  );

  const react = useCallback(
    async (messageId: string, emoji: string | null) => {
      const prev = reactions;
      setReactions((list) => {
        const rest = list.filter((r) => !(r.message_id === messageId && r.user_id === boot.me.id));
        return emoji ? [...rest, { message_id: messageId, user_id: boot.me.id, emoji }] : rest;
      });
      const del = await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", boot.me.id);
      const ins = emoji ? await supabase.from("message_reactions").insert({ message_id: messageId, emoji }) : { error: null };
      if (del.error || ins.error) {
        setReactions(prev);
        throw del.error ?? ins.error;
      }
    },
    [supabase, reactions, boot.me.id],
  );

  const poke = useCallback(
    async (kind: PokeKind) => {
      const { data, error } = await supabase.from("pokes").insert({ room_id: roomId, kind }).select("*").single();
      if (error) throw error;
      setPokes((list) => (list.some((p) => p.id === data.id) ? list : [...list.slice(-59), data as Poke]));
      return data as Poke;
    },
    [supabase, roomId],
  );

  const createDrop = useCallback(
    async (input: {
      x: number;
      y: number;
      buildingId: string | null;
      body: string;
      sticker: string | null;
      file: File | null;
      mode: "ghost" | "day";
      ghostSeconds: number;
    }) => {
      let media: { path: string; kind: "image" | "gif" } | null = null;
      if (input.file) media = await uploadMedia(input.file);
      const { data, error } = await supabase
        .from("signal_drops")
        .insert({
          room_id: roomId,
          client_id: uuid(),
          x: input.x,
          y: input.y,
          building_id: input.buildingId,
          body: input.body.trim() || null,
          sticker: input.sticker,
          media_path: media?.path ?? null,
          media_kind: media?.kind ?? null,
          mode: input.mode,
          ghost_seconds: input.ghostSeconds,
        })
        .select("*")
        .single();
      if (error) throw error;
      setDrops((list) => (list.some((d) => d.id === data.id) ? list : [...list, data as SignalDrop]));
      return data as SignalDrop;
    },
    [supabase, roomId, uploadMedia],
  );

  const deleteDrop = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("signal_drops").delete().eq("id", id);
      if (error) throw error;
      setDrops((list) => list.filter((d) => d.id !== id));
    },
    [supabase],
  );

  const moveMe = useCallback(
    async (x: number, y: number) => {
      const prev = me;
      setMe((p) => ({ ...p, map_x: x, map_y: y }));
      const { error } = await supabase.from("profiles").update({ map_x: x, map_y: y }).eq("id", boot.me.id);
      if (error) {
        setMe(prev);
        throw error;
      }
    },
    [supabase, me, boot.me.id],
  );

  const rename = useCallback(
    async (name: string) => {
      const display_name = name.trim().toUpperCase().slice(0, 24);
      if (!display_name) return;
      const { error } = await supabase.from("profiles").update({ display_name }).eq("id", boot.me.id);
      if (error) throw error;
      setMe((p) => ({ ...p, display_name }));
    },
    [supabase, boot.me.id],
  );

  const markReadAt = useRef(0);
  const markRead = useCallback(async () => {
    if (Date.now() - markReadAt.current < 2000) return;
    markReadAt.current = Date.now();
    await supabase.rpc("mark_read", { p_room: roomId });
    setMembers((list) => list.map((m) => (m.user_id === boot.me.id ? { ...m, last_read_at: new Date().toISOString() } : m)));
  }, [supabase, roomId, boot.me.id]);

  const setTyping = useCallback((typing: boolean) => {
    const ch = presenceChannel.current;
    if (!ch) return;
    const now = Date.now();
    if (typing && now - lastTypingSent.current < 1500) return;
    lastTypingSent.current = typing ? now : 0;
    void ch.send({ type: "broadcast", event: "typing", payload: { user: boot.me.id, typing } });
  }, [boot.me.id]);

  /** Sends a live event to the partner over the private room channel. */
  const broadcast = useCallback(
    (event: "tune" | "tune-ack", payload: Record<string, unknown>) => {
      const ch = presenceChannel.current;
      if (!ch) return false;
      void ch.send({ type: "broadcast", event, payload: { ...payload, from: boot.me.id } });
      return true;
    },
    [boot.me.id],
  );

  const saveSettings = useCallback(
    async (patch: Partial<Omit<Settings, "user_id">>) => {
      setSettings((s) => ({ ...s, ...patch }));
      const { error } = await supabase
        .from("user_settings")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("user_id", boot.me.id);
      if (error) throw error;
    },
    [supabase, boot.me.id],
  );

  // ------------------------------------------------------------ signed URLs for chat images (batched)
  const wanted = useRef(new Set<string>());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestMedia = useCallback((id: string) => {
    if (id.startsWith("local-")) return;
    wanted.current.add(id);
    if (flushTimer.current) return;
    flushTimer.current = setTimeout(async () => {
      flushTimer.current = null;
      const ids = [...wanted.current];
      wanted.current.clear();
      try {
        const res = await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "message", ids }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { items: Record<string, { url: string }>; ttl: number };
        const exp = Date.now() + (json.ttl ?? 120) * 1000 - 10_000;
        setMediaUrls((m) => {
          const next = { ...m };
          for (const [id2, v] of Object.entries(json.items ?? {})) next[id2] = { url: v.url, exp };
          return next;
        });
      } catch {
        /* retried next time the image is shown */
      }
    }, 80);
  }, []);

  const partnerMember = members.find((m) => m.user_id === boot.partner.id);
  const myMember = members.find((m) => m.user_id === boot.me.id);
  const unread = messages.filter(
    (m) => m.sender_id === boot.partner.id && myMember && Date.parse(m.created_at) > Date.parse(myMember.last_read_at),
  ).length;

  return {
    supabase,
    loaded,
    connection,
    messages,
    reactions,
    pokes,
    drops,
    me,
    partner,
    badges,
    settings,
    presence,
    mediaUrls,
    partnerLastReadAt: partnerMember?.last_read_at,
    unread,
    actions: {
      sendText,
      sendSticker,
      sendMedia,
      retry,
      discardFailed,
      unsend,
      react,
      poke,
      createDrop,
      deleteDrop,
      moveMe,
      rename,
      markRead,
      setTyping,
      broadcast,
      saveSettings,
      requestMedia,
      reload: loadAll,
    },
  };
}

export type Room = ReturnType<typeof useRoom>;
