"use client";

import { useEffect, useRef, useState } from "react";
import type { HeroLook } from "@/lib/hero";
import { HeroSprite } from "./HeroSprite";

const IDLE_MS = 45_000;
const TRICKS = ["swing", "spin", "flip", "yoyo", "wave", "hearts", "bounce"] as const;
type Trick = (typeof TRICKS)[number];

const LINES: Record<Trick, string[]> = {
  swing: ["wheee!", "swing time 🕸", "hanging around!"],
  spin: ["spin spin spin!", "*dizzy*", "triple spin!"],
  flip: ["backflip!", "upside down is my best side", "the world looks funny"],
  yoyo: ["boing!", "yo-yo mode", "up… and down!"],
  wave: ["hi there 👋", "still here?", "psst… you there?"],
  hearts: ["sending love 💜", "miss you already", "💕💕💕"],
  bounce: ["hop hop!", "bored… play with me?", "tap me!"],
};

function pick<T>(a: readonly T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}

/**
 * When nobody touches the app for a while, your hero swings down upside-down
 * on a web line and shows off. Any touch sends it zipping back up.
 */
export function IdleHero({ look, reduced, paused }: { look: HeroLook; reduced: boolean; paused: boolean }) {
  const [phase, setPhase] = useState<"hidden" | "enter" | "show" | "exit">("hidden");
  const [trick, setTrick] = useState<Trick>("swing");
  const [line, setLine] = useState("");
  const [x, setX] = useState(60);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Watch for activity; after IDLE_MS of nothing, drop in.
  useEffect(() => {
    if (paused) return;
    const arm = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        if (document.visibilityState !== "visible") return arm();
        setX(18 + Math.random() * 64);
        setTrick(pick(TRICKS));
        setLine("");
        setPhase("enter");
      }, IDLE_MS);
    };
    const wake = () => {
      if (phaseRef.current === "enter" || phaseRef.current === "show") setPhase("exit");
      arm();
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, wake, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", wake);
    arm();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      events.forEach((e) => window.removeEventListener(e, wake, { capture: true }));
      document.removeEventListener("visibilitychange", wake);
    };
  }, [paused]);

  // Hide straight away if something important opens.
  useEffect(() => {
    if (!paused || phaseRef.current === "hidden") return;
    const t = setTimeout(() => setPhase("exit"), 0);
    return () => clearTimeout(t);
  }, [paused]);

  // Phase machine: enter → show (cycling tricks) → exit → hidden.
  useEffect(() => {
    if (phase === "enter") {
      const t = setTimeout(() => {
        setLine(pick(LINES[trick]));
        setPhase("show");
      }, reduced ? 200 : 1300);
      return () => clearTimeout(t);
    }
    if (phase === "exit") {
      const t = setTimeout(() => setPhase("hidden"), reduced ? 100 : 650);
      return () => clearTimeout(t);
    }
    if (phase === "show") {
      const iv = setInterval(() => {
        const t = pick(TRICKS);
        setTrick(t);
        setLine(pick(LINES[t]));
      }, reduced ? 4000 : 2600);
      return () => clearInterval(iv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reduced]);

  if (phase === "hidden") return null;
  return (
    <div className={`idle-spider phase-${phase} trick-${trick} ${reduced ? "calm" : ""}`} style={{ left: `${x}%` }} aria-hidden>
      <div className="idle-rig">
        <span className="idle-thread" />
        <div className="idle-body">
          <span className="hero-hang">
            <HeroSprite look={look} size={104} />
          </span>
          {trick === "hearts" && phase === "show" && (
            <span className="idle-hearts">
              <i>💜</i>
              <i>💖</i>
              <i>💜</i>
            </span>
          )}
        </div>
        {phase === "show" && line && <span className="idle-line">{line}</span>}
      </div>
    </div>
  );
}
