"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Building } from "@/lib/city";
import { friendlyError } from "@/lib/messages";
import { BADGES, POKES } from "@/lib/pixels";
import { synth } from "@/lib/sound";
import type { Bootstrap, Message, PokeKind, SignalDrop, Tab } from "@/lib/types";
import { useRoom, type Room } from "@/lib/useRoom";
import { CityMap, type Bubble, type Flight, type MapMode } from "./CityMap";
import { Comms } from "./Comms";
import { DropComposer, type DropDraft } from "./DropComposer";
import { Header } from "./Header";
import { Icon } from "./Icon";
import { Intro } from "./Intro";
import { ProfilePanel } from "./Profile";
import { Reveal, type RevealTarget } from "./Reveal";
import { Secret } from "./Secret";
import { Signals } from "./Signals";
import { Toasts, type Toast } from "./Toasts";
import { Equaliser, TuneButton, type TuneStatus } from "./TuneButton";
import { playTuneOnce } from "@/lib/tune";

const INTRO_KEY = "ws-intro-seen";
const SOUND_PROMPT_KEY = "ws-sound-prompt";

function readSession(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeSession(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    /* storage blocked (private mode) */
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

function useHour() {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const t = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(t);
  }, []);
  return hour;
}

export function SignalApp({ boot }: { boot: Bootstrap }) {
  const [tab, setTab] = useState<Tab>("map");
  // This component only renders in the browser (see ClientApp), so storage is safe to read here.
  const [introDone, setIntroDone] = useState(() => readSession(INTRO_KEY));
  const [soundPrompt, setSoundPrompt] = useState(() => !readSession(SOUND_PROMPT_KEY));
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>("browse");
  const [pendingDrop, setPendingDrop] = useState<{ x: number; y: number; building?: Building } | null>(null);
  const [dropBusy, setDropBusy] = useState(false);
  const [reveal, setReveal] = useState<RevealTarget | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [celebrate, setCelebrate] = useState(false);
  const [secret, setSecret] = useState(false);
  const [cooling, setCooling] = useState(false);
  const [flash, setFlash] = useState(false);
  const [tuneOut, setTuneOut] = useState<{ id: string; status: Exclude<TuneStatus, "idle"> } | null>(null);
  const [tuneIn, setTuneIn] = useState<string | null>(null);
  const tuneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);
  const logoTaps = useRef<number[]>([]);
  const hearts = useRef({ mine: 0, theirs: 0 });
  const prefersReduced = useReducedMotion();
  // Handlers passed into useRoom run later; these refs give them the latest values.
  const roomRef = useRef<Room | null>(null);
  const enableSoundRef = useRef<() => void>(() => {});
  const hour = useHour();

  // ------------------------------------------------------------------ toasts & effects
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (t: Omit<Toast, "id">, ms = 4500) => {
      const id = ++seq.current;
      setToasts((list) => [...list.slice(-3), { ...t, id }]);
      setTimeout(() => dismiss(id), ms);
    },
    [dismiss],
  );

  const shout = useCallback((userId: string, text: string) => {
    const key = ++seq.current;
    setBubbles((b) => [...b.slice(-3), { key, userId, text }]);
    setTimeout(() => setBubbles((b) => b.filter((x) => x.key !== key)), 2600);
  }, []);

  const fly = useCallback((fromId: string, icon: string) => {
    const key = ++seq.current;
    setFlights((f) => [...f.slice(-5), { key, fromId, icon }]);
    setTimeout(() => setFlights((f) => f.filter((x) => x.key !== key)), 1300);
  }, []);

  const party = useCallback((ms = 2600) => {
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), ms);
  }, []);

  /** Plays a sound, or flashes the screen when sound is off/locked. */
  const alert = useCallback((name: Parameters<typeof synth.play>[0]) => {
    const heard = synth.play(name);
    if (!heard) {
      setFlash(true);
      setTimeout(() => setFlash(false), 450);
    }
    synth.vibrate(name === "poke" ? [30, 40, 30] : 40);
  }, []);

  const tabRef = useRef(tab);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  const checkHeartSync = useCallback(() => {
    const { mine, theirs } = hearts.current;
    if (mine && theirs && Math.abs(mine - theirs) < 10_000) {
      hearts.current = { mine: 0, theirs: 0 };
      party(4000);
      toast({ text: "HEART SYNC! YOU BOTH SENT LOVE AT ONCE", icon: "heart", tone: "love" }, 5000);
    }
  }, [party, toast]);

  // ------------------------------------------------------------------ room
  const room = useRoom(
    boot,
    {
      onMessage: (m: Message) => {
        alert(m.mode === "ghost" ? "ghost" : "message");
        if (tabRef.current !== "comms") {
          toast({
            text: m.mode === "ghost" ? `👻 GHOST SIGNAL FROM ${boot.partner.display_name}` : `NEW SIGNAL FROM ${boot.partner.display_name}`,
            icon: m.mode === "ghost" ? "ghost" : "sparkle",
            action: { label: "OPEN", run: () => setTab("comms") },
          });
        }
      },
      onPoke: (p) => {
        alert("poke");
        const info = POKES.find((x) => x.kind === p.kind);
        shout(p.sender_id, info?.shout ?? "HEY!");
        fly(p.sender_id, p.kind);
        if (p.kind === "heart" || p.kind === "fingerheart") {
          hearts.current.theirs = Date.now();
          checkHeartSync();
        }
        if (tabRef.current !== "map") {
          toast({ text: `${boot.partner.display_name}: ${info?.shout ?? "POKE!"}`, icon: p.kind, tone: "love" });
        }
      },
      onDrop: () => {
        alert("drop");
        toast({
          text: "SIGNAL DROP NEARBY! CHECK THE ROOFTOPS",
          icon: "star",
          action: { label: "SHOW", run: () => setTab("map") },
        });
      },
      onDropOpened: () => {
        toast({ text: `${boot.partner.display_name} OPENED YOUR DROP`, icon: "moon" });
      },
      onBadge: (b) => {
        if (b.user_id !== boot.me.id) return;
        synth.play("badge");
        toast({ text: `BADGE UNLOCKED: ${BADGES[b.badge_key]?.title ?? b.badge_key}`, icon: BADGES[b.badge_key]?.icon ?? "star", tone: "badge" }, 6000);
      },
      onTune: async ({ id }) => {
        const r = roomRef.current;
        if (!r) return;
        const name = boot.partner.display_name;
        if (tuneIn) {
          r.actions.broadcast("tune-ack", { id, state: "busy" });
          return;
        }
        if (!r.settings.sound_on || !synth.unlocked) {
          r.actions.broadcast("tune-ack", { id, state: "blocked" });
          toast(
            { text: `${name} PLAYED YOU A TUNE — TURN ON SOUND TO HEAR IT`, icon: "zap", tone: "love", action: { label: "SOUND ON", run: () => enableSoundRef.current() } },
            7000,
          );
          return;
        }
        setTuneIn(id);
        shout(boot.partner.id, "♪ ♪ ♪");
        const duration = await playTuneOnce(() => {
          setTuneIn(null);
          r.actions.broadcast("tune-ack", { id, state: "ended" });
        });
        if (duration === null) {
          setTuneIn(null);
          r.actions.broadcast("tune-ack", { id, state: "blocked" });
        } else {
          r.actions.broadcast("tune-ack", { id, state: "started", duration });
        }
      },
      onTuneAck: ({ id, state, duration }) => {
        if (!tuneOut || tuneOut.id !== id) return;
        if (tuneTimer.current) clearTimeout(tuneTimer.current);
        if (state === "started") {
          setTuneOut({ id, status: "playing" });
          tuneTimer.current = setTimeout(() => setTuneOut(null), ((duration ?? 30) + 3) * 1000);
          return;
        }
        setTuneOut(null);
        if (state === "blocked") toast({ text: `${boot.partner.display_name}'S SOUND IS OFF — THEY GOT A NOTE INSTEAD`, tone: "warn" });
        if (state === "busy") toast({ text: "THE TUNE IS ALREADY PLAYING OVER THERE", tone: "warn" });
      },
      onPartnerArrive: () => {
        toast({ text: `${boot.partner.display_name} IS ONLINE`, icon: "sparkle", tone: "love" });
        party();
      },
    },
    tab,
  );

  // ------------------------------------------------------------------ intro + sound prompt
  const finishIntro = useCallback(() => {
    setIntroDone(true);
    writeSession(INTRO_KEY);
  }, []);

  useEffect(() => {
    synth.enabled = room.settings.sound_on && soundUnlocked;
    synth.setVolume(room.settings.volume);
  }, [room.settings.sound_on, room.settings.volume, soundUnlocked]);

  const enableSound = useCallback(async () => {
    const ok = await synth.unlock();
    setSoundUnlocked(ok);
    setSoundPrompt(false);
    writeSession(SOUND_PROMPT_KEY);
    if (ok) {
      synth.enabled = true;
      if (!room.settings.sound_on) void room.actions.saveSettings({ sound_on: true });
      synth.play("startup", true);
    } else {
      toast({ text: "THIS BROWSER BLOCKED SOUND — ALERTS WILL FLASH INSTEAD", tone: "warn" });
    }
  }, [room.settings.sound_on, room.actions, toast]);

  useEffect(() => {
    roomRef.current = room;
    enableSoundRef.current = () => void enableSound();
  });

  // Unread count in the tab title.
  useEffect(() => {
    document.title = room.unread > 0 ? `(${room.unread}) WEB//SIGNAL` : "WEB//SIGNAL";
  }, [room.unread]);

  // Pause decorative animation while the page is hidden.
  useEffect(() => {
    const onVis = () => document.documentElement.classList.toggle("page-hidden", document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // ------------------------------------------------------------------ actions
  const onPoke = async (kind: PokeKind) => {
    setCooling(true);
    setTimeout(() => setCooling(false), 700);
    try {
      await room.actions.poke(kind);
      synth.play("send");
      const info = POKES.find((x) => x.kind === kind);
      shout(boot.me.id, info?.shout ?? "HEY!");
      fly(boot.me.id, kind);
      if (kind === "heart" || kind === "fingerheart") {
        hearts.current.mine = Date.now();
        checkHeartSync();
      }
      if (tab !== "map") toast({ text: `${info?.label ?? "POKE"} SENT`, icon: kind }, 1800);
    } catch (e) {
      toast({ text: friendlyError(e), tone: "warn" });
    }
  };

  const onPick = async (x: number, y: number, building?: Building) => {
    if (mapMode === "drop") {
      setPendingDrop({ x, y, building });
    } else if (mapMode === "move") {
      setMapMode("browse");
      try {
        await room.actions.moveMe(x, y);
        shout(boot.me.id, "I'M HERE!");
      } catch (e) {
        toast({ text: friendlyError(e), tone: "warn" });
      }
    }
  };

  const submitDrop = async (d: DropDraft) => {
    if (!pendingDrop) return;
    setDropBusy(true);
    try {
      await room.actions.createDrop({
        x: pendingDrop.x,
        y: pendingDrop.y,
        buildingId: pendingDrop.building?.id ?? null,
        body: d.body,
        sticker: d.sticker,
        file: d.file,
        mode: d.mode,
        ghostSeconds: d.ghostSeconds,
      });
      synth.play("drop");
      toast({ text: "SIGNAL DROPPED ON THE MAP", icon: "star" });
      setPendingDrop(null);
      setMapMode("browse");
    } catch (e) {
      toast({ text: e instanceof Error && /^[A-Z0-9 ().,'—-]+$/.test(e.message) ? e.message : friendlyError(e), tone: "warn" });
    } finally {
      setDropBusy(false);
    }
  };

  const openDrop = (d: SignalDrop) => {
    setReveal({ type: "drop", id: d.id, fromName: room.partner.display_name, mine: d.sender_id === boot.me.id });
  };

  const sendTune = () => {
    if (tuneOut) return;
    // Always try: presence can lag a few seconds, and the reply (or the
    // timeout below) tells us whether it actually reached the other phone.
    const id = crypto.randomUUID();
    if (!room.actions.broadcast("tune", { id })) {
      toast({ text: "STILL LINKING — TRY AGAIN IN A SECOND", tone: "warn" });
      return;
    }
    setTuneOut({ id, status: "waiting" });
    if (tuneTimer.current) clearTimeout(tuneTimer.current);
    tuneTimer.current = setTimeout(() => {
      setTuneOut(null);
      toast({
        text: room.presence.online ? "NO ANSWER — THE TUNE DIDN'T REACH THEM" : `${room.partner.display_name} ISN'T ONLINE — THE TUNE ONLY PLAYS LIVE`,
        tone: "warn",
      });
    }, 10_000);
  };

  useEffect(
    () => () => {
      if (tuneTimer.current) clearTimeout(tuneTimer.current);
    },
    [],
  );

  const onLogoTap = () => {
    const now = Date.now();
    logoTaps.current = [...logoTaps.current.filter((t) => now - t < 1200), now];
    if (logoTaps.current.length >= 3) {
      logoTaps.current = [];
      setSecret(true);
      synth.play("badge");
    }
  };

  const onEasterEgg = (kind: "rooftop" | "tower" | "river" | "towers-all") => {
    if (kind === "tower") toast({ text: "SECRET: YOU WOKE FIVE ROOFTOP PIGEONS", icon: "pigeon" });
    if (kind === "towers-all") toast({ text: "SECRET: EVERY WATER TOWER FOUND. PIGEON ROYALTY.", icon: "pigeon", tone: "badge" }, 6000);
    if (kind === "river") toast({ text: "THE RIVER WHISPERS: CHECK THE BOTTOM LEFT…", icon: "moon" });
  };

  const changePassword = async (pw: string) => {
    if (pw.length < 8) return "PASSWORD MUST BE AT LEAST 8 CHARACTERS";
    const { error } = await room.supabase.auth.updateUser({ password: pw });
    return error ? "COULDN'T UPDATE PASSWORD — TRY A DIFFERENT ONE" : null;
  };

  // ------------------------------------------------------------------ render
  const reduced = prefersReduced || room.settings.reduced_fx;
  const night = room.settings.theme === "night" || (room.settings.theme === "auto" && (hour < 7 || hour >= 19));
  const newDrops = room.drops.filter((d) => d.sender_id !== boot.me.id && !d.opened_at).length;

  return (
    <div className={`app-shell ${night ? "theme-night" : "theme-day"} ${reduced ? "reduced" : ""} tab-${tab} ${flash ? "flash" : ""} ${introDone && soundPrompt && !soundUnlocked ? "has-sound-prompt" : ""}`}>
      <div className="crt" aria-hidden />

      <Header
        me={room.me}
        partner={room.partner}
        partnerOnline={room.presence.online}
        connection={room.connection}
        unread={tab === "comms" ? 0 : room.unread}
        soundOn={soundUnlocked && room.settings.sound_on}
        onLogoTap={onLogoTap}
        onEnableSound={enableSound}
      />

      {(room.connection === "offline" || room.connection === "reconnecting") && (
        <div className="net-banner" role="status">
          {room.connection === "offline" ? "NO SIGNAL — YOU'RE OFFLINE" : "SIGNAL LOST — RECONNECTING…"}
        </div>
      )}

      <main className="stage">
        <div className="map-area">
          <CityMap
            me={room.me}
            partner={room.partner}
            partnerOnline={room.presence.online}
            partnerTyping={room.presence.typing}
            partnerView={room.presence.view}
            drops={room.drops}
            mode={mapMode}
            night={night}
            celebrate={celebrate}
            bubbles={bubbles}
            flights={reduced ? [] : flights}
            onPick={onPick}
            onOpenDrop={openDrop}
            onEasterEgg={onEasterEgg}
          />
          <div className="map-actions">
            {mapMode === "browse" ? (
              <>
                <button type="button" className="btn btn-coral" onClick={() => setMapMode("drop")}>
                  ▼ DROP
                </button>
                <button type="button" className="btn btn-green" onClick={() => setMapMode("move")}>
                  ⇄ MOVE
                </button>
                <button type="button" className="btn btn-violet" onClick={() => onPoke("heart")} disabled={cooling} aria-label="Send a heart">
                  <Icon name="heart" size={18} />
                </button>
                <TuneButton status={tuneOut?.status ?? "idle"} onPress={sendTune} partnerName={room.partner.display_name} />
              </>
            ) : (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setMapMode("browse");
                  setPendingDrop(null);
                }}
              >
                ✕ CANCEL
              </button>
            )}
          </div>
          {celebrate && room.presence.online && <div className="both-online">★ BOTH ONLINE ★</div>}
        </div>

        {tab !== "map" && (
          <div className="panel" key={tab}>
            {tab === "comms" && (
              <Comms
                room={room}
                me={room.me}
                partner={room.partner}
                presence={room.presence}
                active={tab === "comms"}
                onOpenGhost={(m) => setReveal({ type: "message", id: m.id, fromName: room.partner.display_name, mine: false })}
                onToast={(text, tone) => toast({ text, tone })}
                onSent={() => synth.play("send")}
              />
            )}
            {tab === "signals" && (
              <Signals
                tune={<TuneButton status={tuneOut?.status ?? "idle"} onPress={sendTune} partnerName={room.partner.display_name} wide />}
                me={room.me}
                partner={room.partner}
                pokes={room.pokes}
                drops={room.drops}
                badges={room.badges}
                cooling={cooling}
                onPoke={onPoke}
                onStartDrop={() => {
                  setTab("map");
                  setMapMode("drop");
                }}
                onStartMove={() => {
                  setTab("map");
                  setMapMode("move");
                }}
                onOpenDrop={openDrop}
                onDeleteDrop={async (d) => {
                  try {
                    await room.actions.deleteDrop(d.id);
                  } catch (e) {
                    toast({ text: friendlyError(e), tone: "warn" });
                  }
                }}
              />
            )}
            {tab === "profile" && (
              <ProfilePanel
                me={room.me}
                settings={room.settings}
                badges={room.badges}
                soundUnlocked={soundUnlocked}
                onEnableSound={enableSound}
                onSave={(patch) => room.actions.saveSettings(patch).catch((e) => toast({ text: friendlyError(e), tone: "warn" }))}
                onRename={async (n) => {
                  try {
                    await room.actions.rename(n);
                    toast({ text: "NAME UPDATED", icon: "sparkle" });
                  } catch (e) {
                    toast({ text: friendlyError(e), tone: "warn" });
                  }
                }}
                onChangePassword={changePassword}
              />
            )}
          </div>
        )}
      </main>

      <nav className="nav-bar" aria-label="Main">
        {(
          [
            ["map", "MAP", "◉"],
            ["comms", "COMMS", "✉"],
            ["signals", "SIGNALS", "⚡"],
            ["profile", "PROFILE", "☺"],
          ] as const
        ).map(([key, label, glyph]) => (
          <button
            key={key}
            type="button"
            className={`nav-btn ${tab === key ? "on" : ""}`}
            onClick={() => {
              setTab(key);
              if (key !== "map") {
                setMapMode("browse");
                setPendingDrop(null);
              }
            }}
            aria-current={tab === key ? "page" : undefined}
          >
            <span className="nav-glyph" aria-hidden>
              {glyph}
            </span>
            <span>{label}</span>
            {key === "comms" && room.unread > 0 && tab !== "comms" && <span className="nav-badge">{room.unread > 9 ? "9+" : room.unread}</span>}
            {key === "signals" && newDrops > 0 && tab !== "signals" && <span className="nav-badge">{newDrops}</span>}
          </button>
        ))}
      </nav>

      {pendingDrop && (
        <DropComposer
          where={pendingDrop.building ? `ROOFTOP ${pendingDrop.building.id.toUpperCase()}` : "STREET LEVEL"}
          busy={dropBusy}
          onSubmit={submitDrop}
          onCancel={() => setPendingDrop(null)}
        />
      )}

      {reveal && (
        <Reveal
          target={reveal}
          reduced={reduced}
          onClose={() => setReveal(null)}
          onExpired={() => void room.actions.reload()}
        />
      )}

      {secret && <Secret boot={boot} messages={room.messages} pokes={room.pokes} onClose={() => setSecret(false)} />}

      {introDone && soundPrompt && !soundUnlocked && (
        <div className="sound-prompt" role="dialog" aria-label="Enable sound">
          <Icon name="zap" size={32} />
          <p>TURN ON SIGNAL SOUND SO YOU HEAR POKES AND MESSAGES?</p>
          <div className="row-between gap">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setSoundPrompt(false);
                writeSession(SOUND_PROMPT_KEY);
              }}
            >
              NOT NOW
            </button>
            <button type="button" className="btn btn-orange" onClick={enableSound}>
              ♪ ENABLE SIGNAL SOUND
            </button>
          </div>
        </div>
      )}

      {tuneIn && (
        <div className="tune-banner" role="status">
          <Equaliser />
          <span>{room.partner.display_name} IS PLAYING YOUR TUNE</span>
        </div>
      )}

      <Toasts toasts={toasts} onDismiss={dismiss} />

      {!introDone && <Intro onDone={finishIntro} reduced={reduced} />}
    </div>
  );
}
