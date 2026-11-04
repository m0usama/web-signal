"use client";

import { useEffect, useRef, useState } from "react";
import { H, HAND, W, type HeroLook } from "@/lib/hero";
import { HeroSprite } from "./HeroSprite";
import { HERO_DEMO_EVENT, useIdleMs } from "@/lib/idlePref";

const SIZE = 120;

/** Every stunt: its speech lines and any little effects that float off it. */
const STUNTS = {
  swing: { lines: ["wheee!", "swing time 🕸", "hanging around!"], fx: [] },
  bigswing: { lines: ["BIG SWING!", "whoooa!", "higher, higher!"], fx: ["💨", "💨"] },
  spin: { lines: ["spin spin spin!", "*dizzy*", "triple spin!"], fx: ["🌀"] },
  flip: { lines: ["front flip!", "nailed it!", "10/10 landing"], fx: ["✨"] },
  cartwheel: { lines: ["cartwheel!", "round we go", "look at me!"], fx: ["⭐"] },
  yoyo: { lines: ["boing!", "yo-yo mode", "up… and down!"], fx: [] },
  zip: { lines: ["zip!", "bungee!!", "eek, too fast!"], fx: ["💨"] },
  bounce: { lines: ["hop hop!", "bored… play with me?", "tap me!"], fx: [] },
  jelly: { lines: ["wobble wobble", "i'm jelly", "squishy!"], fx: [] },
  wave: { lines: ["hi there 👋", "still here?", "psst… you there?"], fx: ["👋"] },
  dance: { lines: ["dance break!", "♪ la la la ♪", "got moves?"], fx: ["🎵", "🎶", "🎵"] },
  hearts: { lines: ["sending love 💜", "miss you already", "💕💕💕"], fx: ["💜", "💖", "💜"] },
  dizzy: { lines: ["@_@", "too much swinging", "the city is spinning"], fx: ["⭐", "💫", "⭐"] },
  sleepy: { lines: ["zzz…", "so quiet…", "wake me up when you're back"], fx: ["💤", "z", "Z"] },
  sparkle: { lines: ["shiny!", "hero mode ON", "✨ fabulous ✨"], fx: ["✨", "✨", "✨"] },
  selfie: { lines: ["selfie!", "say cheese 📸", "for the album"], fx: ["📸"] },
  letter: { lines: ["you've got mail 💌", "a note for you", "special delivery!"], fx: ["💌"] },
  webshot: { lines: ["zip-line!", "web shot!", "got it!"], fx: [] },
  peace: { lines: ["peace ✌️", "chillin'", "all good here"], fx: ["✌️"] },
  backflip: { lines: ["backflip!", "did you see that?", "again!"], fx: ["💥"] },
} as const;
type Stunt = keyof typeof STUNTS;
const ALL = Object.keys(STUNTS) as Stunt[];

function pick<T>(a: readonly T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}

/**
 * When nobody touches the app for a while, your hero swings in on a web line,
 * holding on with one hand, and does stunts. Any touch sends it swinging off.
 */
export function IdleHero({ look, reduced, paused }: { look: HeroLook; reduced: boolean; paused: boolean }) {
  const idleMs = useIdleMs();
  const [phase, setPhase] = useState<"hidden" | "enter" | "show" | "exit">("hidden");
  const [stunt, setStunt] = useState<Stunt>("swing");
  const [round, setRound] = useState(0);
  const [line, setLine] = useState("");
  const [x, setX] = useState(60);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef(phase);
  const stuntRef = useRef<Stunt>("swing");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Watch for activity; after the chosen idle time, swing in.
  useEffect(() => {
    if (paused) return;
    const swingIn = () => {
      setX(32 + Math.random() * 36);
      stuntRef.current = "swing";
      setStunt("swing");
      setLine("");
      setPhase("enter");
    };
    const arm = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (!idleMs) return;
      idleTimer.current = setTimeout(() => {
        if (document.visibilityState !== "visible") return arm();
        swingIn();
      }, idleMs);
    };
    const demo = () => setTimeout(swingIn, 50);
    const wake = () => {
      if (phaseRef.current === "enter" || phaseRef.current === "show") setPhase("exit");
      arm();
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, wake, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", wake);
    window.addEventListener(HERO_DEMO_EVENT, demo);
    arm();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      events.forEach((e) => window.removeEventListener(e, wake, { capture: true }));
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener(HERO_DEMO_EVENT, demo);
    };
  }, [paused, idleMs]);

  // Hide straight away if something important opens.
  useEffect(() => {
    if (!paused || phaseRef.current === "hidden") return;
    const t = setTimeout(() => setPhase("exit"), 0);
    return () => clearTimeout(t);
  }, [paused]);

  // Phase machine: enter → show (a new stunt every few seconds) → exit → hidden.
  useEffect(() => {
    if (phase === "enter") {
      const t = setTimeout(() => {
        setLine(pick(STUNTS.swing.lines));
        setPhase("show");
      }, reduced ? 200 : 2300);
      return () => clearTimeout(t);
    }
    if (phase === "exit") {
      const t = setTimeout(() => setPhase("hidden"), reduced ? 100 : 700);
      return () => clearTimeout(t);
    }
    if (phase === "show") {
      const iv = setInterval(() => {
        let next = pick(ALL);
        while (next === stuntRef.current) next = pick(ALL);
        stuntRef.current = next;
        setStunt(next);
        setLine(pick(STUNTS[next].lines));
        setRound((r) => r + 1);
      }, reduced ? 4500 : 3000);
      return () => clearInterval(iv);
    }
  }, [phase, reduced]);

  if (phase === "hidden") return null;
  // Shift the sprite so the raised hand sits exactly on the end of the line.
  const width = (SIZE * W) / H;
  const dx = -((HAND.x - W / 2) / W) * width;
  const dy = -(HAND.y / H) * SIZE;
  const fx = phase === "show" ? STUNTS[stunt].fx : [];
  return (
    <div className={`idle-spider idle-hero phase-${phase} trick-${stunt} ${reduced ? "calm" : ""}`} style={{ left: `${x}%` }} aria-hidden>
      <div className="idle-rig">
        <span className="idle-thread" />
        <div className="idle-body" key={`${stunt}-${round}`}>
          <span className="hero-holder" style={{ transform: `translate(${dx}px, ${dy}px)` }}>
            <HeroSprite look={look} size={SIZE} pose="swing" />
          </span>
          {stunt === "webshot" && phase === "show" && <span className="idle-webshot" />}
          {stunt === "selfie" && phase === "show" && <span className="idle-flash" />}
          {fx.length > 0 && (
            <span className={`idle-fx fx-${stunt}`}>
              {fx.map((f, i) => (
                <i key={i}>{f}</i>
              ))}
            </span>
          )}
        </div>
        {phase === "show" && line && (
          <span className="idle-line" key={line}>
            {line}
          </span>
        )}
      </div>
    </div>
  );
}
