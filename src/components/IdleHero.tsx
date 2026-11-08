"use client";

import { useEffect, useRef, useState } from "react";
import { H, HAND, TOP, W, type HeroLook } from "@/lib/hero";
import { HeroSprite } from "./HeroSprite";
import { HERO_DEMO_EVENT, useIdleMs } from "@/lib/idlePref";

const SIZE = 120;
/** How long each stunt stays before blending into the next. */
const STUNT_MS = 7000;
/** Blend time from wherever the hero is back to its resting pose. */
const BLEND_MS = 700;

type Frame = { t?: number; rig?: number; x?: number; y?: number; r?: number; ry?: number; sx?: number; sy?: number; len?: number; e?: string };
interface Stunt {
  ms: number;
  frames: Frame[];
  fx?: string[];
  extra?: "webshot" | "flash";
}

const S = "cubic-bezier(0.45, 0, 0.55, 1)"; // smooth ease in-out

/**
 * Every stunt starts and ends in the resting pose, so it loops seamlessly and
 * the hero can blend into the next one without jumping.
 * rig = swing angle of the whole line, x/y/r/ry/sx/sy = body moves around
 * the hand, len = how much longer/shorter the web line gets (px).
 */
const STUNTS: Record<string, Stunt> = {
  swing: { ms: 3200, frames: [{ rig: 0 }, { rig: 22 }, { rig: 0 }, { rig: -22 }, { rig: 0 }] },
  bigswing: { ms: 3600, frames: [{ rig: 0 }, { rig: 40 }, { rig: 0 }, { rig: -40 }, { rig: 0 }], fx: ["💨"] },
  spin: { ms: 2400, frames: [{ ry: 0, e: "linear" }, { ry: 360 }], fx: ["🌀"] },
  flip: { ms: 2800, frames: [{ r: 0, t: 0 }, { r: 0, t: 0.3 }, { r: 360, t: 0.75 }, { r: 360, t: 1 }], fx: ["✨"] },
  backflip: { ms: 2800, frames: [{ r: 0, t: 0 }, { r: 0, t: 0.3 }, { r: -360, t: 0.75 }, { r: -360, t: 1 }], fx: ["💥"] },
  cartwheel: { ms: 3600, frames: [{ x: 0, r: 0 }, { x: 28, r: 180 }, { x: 0, r: 360 }, { x: -28, r: 540 }, { x: 0, r: 720 }] },
  yoyo: { ms: 2600, frames: [{ len: 0 }, { len: -110 }, { len: 0 }] },
  zip: { ms: 3200, frames: [{ len: 0, t: 0 }, { len: -170, t: 0.35, e: "cubic-bezier(0.6,0,0.9,0.4)" }, { len: 40, t: 0.6 }, { len: -14, t: 0.78 }, { len: 0, t: 1 }], fx: ["💨"] },
  bounce: { ms: 1600, frames: [{ y: 0 }, { y: -18 }, { y: 0 }] },
  jelly: { ms: 2000, frames: [{ sx: 1, sy: 1 }, { sx: 1.12, sy: 0.88 }, { sx: 0.92, sy: 1.08 }, { sx: 1.04, sy: 0.96 }, { sx: 1, sy: 1 }] },
  wave: { ms: 2000, frames: [{ r: 0 }, { r: 9 }, { r: 0 }, { r: -9 }, { r: 0 }], fx: ["👋"] },
  dance: { ms: 2400, frames: [{ x: 0, r: 0, y: 0 }, { x: -10, r: -12, y: 0 }, { x: 0, r: 0, y: -8 }, { x: 10, r: 12, y: 0 }, { x: 0, r: 0, y: 0 }], fx: ["🎵", "🎶", "🎵"] },
  hearts: { ms: 2400, frames: [{ y: 0 }, { y: -7 }, { y: 0 }], fx: ["💜", "💖", "💜"] },
  dizzy: { ms: 2600, frames: [{ r: 0 }, { r: 10, x: 4 }, { r: 0 }, { r: -10, x: -4 }, { r: 0 }], fx: ["⭐", "💫", "⭐"] },
  sleepy: { ms: 4000, frames: [{ r: 0, y: 0 }, { r: 6, y: 3 }, { r: 0, y: 0 }], fx: ["💤", "z", "Z"] },
  sparkle: { ms: 2400, frames: [{ y: 0 }, { y: -6, sx: 1.04, sy: 1.04 }, { y: 0 }], fx: ["✨", "✨", "✨"] },
  selfie: { ms: 2800, frames: [{ r: 0 }, { r: -6 }, { r: 4 }, { r: 0 }], fx: ["📸"], extra: "flash" },
  letter: { ms: 2400, frames: [{ y: 0 }, { y: -6 }, { y: 0 }], fx: ["💌"] },
  webshot: { ms: 2400, frames: [{ r: 0, t: 0 }, { r: -14, t: 0.12 }, { r: 0, t: 0.5 }, { r: 0, t: 1 }], extra: "webshot" },
  peace: { ms: 2400, frames: [{ r: 0 }, { r: 6 }, { r: 0 }, { r: -6 }, { r: 0 }], fx: ["✌️"] },
};
const ALL = Object.keys(STUNTS);
const SWING_RIG = new Set(["swing", "bigswing"]);
/** Gentle sway of the line for stunts that don't swing it themselves. */
const SWAY: Frame[] = [{ rig: 0 }, { rig: 5 }, { rig: 0 }, { rig: -5 }, { rig: 0 }];

const bodyT = (f: Frame) => `translate(${f.x ?? 0}px, ${(f.y ?? 0) + (f.len ?? 0)}px) rotate(${f.r ?? 0}deg) rotateY(${f.ry ?? 0}deg) scale(${f.sx ?? 1}, ${f.sy ?? 1})`;
const rigT = (f: Frame) => `rotate(${f.rig ?? 0}deg)`;
const REST_BODY = bodyT({});

function keyframes(frames: Frame[], fn: (f: Frame) => string, extra?: (f: Frame) => Keyframe) {
  return frames.map((f, i) => ({
    transform: fn(f),
    offset: f.t ?? i / (frames.length - 1),
    easing: f.e ?? S,
    ...(extra ? extra(f) : {}),
  }));
}

/** Cancel what an element is doing and glide it back to `rest`, then run `next`. */
function blendThen(el: HTMLElement | null, rest: string, next: () => void) {
  if (!el) return;
  const from = getComputedStyle(el).transform;
  el.getAnimations().forEach((a) => a.cancel());
  const lead = el.animate([{ transform: from === "none" ? rest : from }, { transform: rest }], { duration: BLEND_MS, easing: S, fill: "forwards" });
  lead.onfinish = () => {
    next();
    lead.cancel();
  };
}

function pick<T>(a: readonly T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}

/**
 * When nobody touches the app for a while, your hero swings in on a web line,
 * holding on with one hand, and does stunts. Any touch sends it swinging off.
 * Motion runs on the Web Animations API so stunts blend smoothly.
 */
export function IdleHero({ look, reduced, paused }: { look: HeroLook; reduced: boolean; paused: boolean }) {
  const idleMs = useIdleMs();
  const [phase, setPhase] = useState<"hidden" | "show" | "exit">("hidden");
  const [stunt, setStunt] = useState("swing");
  const [x, setX] = useState(50);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef(phase);
  const stuntRef = useRef("swing");
  const rig = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const thread = useRef<HTMLSpanElement>(null);
  const [base, setBase] = useState(260);
  const baseRef = useRef(260);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const play = (name: string) => {
    const s = STUNTS[name];
    const b = baseRef.current;
    blendThen(rig.current, "rotate(0deg)", () => {
      rig.current?.animate(keyframes(SWING_RIG.has(name) ? s.frames : SWAY, rigT), { duration: SWING_RIG.has(name) ? s.ms : 4200, iterations: Infinity });
    });
    blendThen(body.current, REST_BODY, () => {
      if (SWING_RIG.has(name)) return;
      body.current?.animate(keyframes(s.frames, bodyT), { duration: s.ms, iterations: Infinity });
    });
    blendThen(thread.current, "scaleY(1)", () => {
      if (!s.frames.some((f) => f.len)) return;
      thread.current?.animate(
        keyframes(s.frames, (f) => `scaleY(${(b + (f.len ?? 0)) / b})`),
        { duration: s.ms, iterations: Infinity },
      );
    });
  };

  // Watch for activity; after the chosen idle time, swing in.
  useEffect(() => {
    if (paused) return;
    const swingIn = () => {
      if (phaseRef.current === "show") return;
      const h = Math.round(window.innerHeight * 0.34);
      baseRef.current = h;
      setBase(h);
      setX(34 + Math.random() * 32);
      setStunt("swing");
      setPhase("show");
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
      if (phaseRef.current === "show") setPhase("exit");
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
    if (!paused || phaseRef.current !== "show") return;
    const t = setTimeout(() => setPhase("exit"), 0);
    return () => clearTimeout(t);
  }, [paused]);

  // Entrance swing, then a new stunt every STUNT_MS.
  useEffect(() => {
    if (phase !== "show") return;
    const r = rig.current;
    if (reduced || !r) return;
    const enter = r.animate(
      [
        { transform: "rotate(-80deg)", offset: 0 },
        { transform: "rotate(30deg)", offset: 0.4 },
        { transform: "rotate(-14deg)", offset: 0.64 },
        { transform: "rotate(6deg)", offset: 0.82 },
        { transform: "rotate(0deg)", offset: 1 },
      ],
      { duration: 2600, easing: "cubic-bezier(0.3, 0, 0.4, 1)", fill: "forwards" },
    );
    let iv: ReturnType<typeof setInterval> | undefined;
    enter.onfinish = () => {
      enter.cancel();
      stuntRef.current = "swing";
      play("swing");
      iv = setInterval(() => {
        let next = pick(ALL);
        while (next === stuntRef.current) next = pick(ALL);
        stuntRef.current = next;
        setStunt(next);
        play(next);
      }, STUNT_MS);
    };
    return () => {
      enter.cancel();
      if (iv) clearInterval(iv);
    };
  }, [phase, reduced]);

  // Exit: swing off to the side and fade.
  useEffect(() => {
    if (phase !== "exit") return;
    const r = rig.current;
    const done = () => setPhase("hidden");
    if (reduced || !r) {
      const t = setTimeout(done, 120);
      return () => clearTimeout(t);
    }
    const from = getComputedStyle(r).transform;
    r.getAnimations().forEach((a) => a.cancel());
    body.current?.getAnimations().forEach((a) => a.pause());
    const out = r.animate([{ transform: from === "none" ? "rotate(0deg)" : from, opacity: 1 }, { transform: "rotate(75deg)", opacity: 0 }], {
      duration: 650,
      easing: "cubic-bezier(0.5, 0, 0.9, 0.5)",
      fill: "forwards",
    });
    out.onfinish = done;
    return () => out.cancel();
  }, [phase, reduced]);

  if (phase === "hidden") return null;
  // Shift the sprite so the raised hand sits exactly on the end of the line.
  const width = (SIZE * W) / H;
  const dx = -(HAND.x / W) * width;
  const dy = -((HAND.y - TOP) / H) * SIZE;
  const s = STUNTS[stunt];
  const showFx = phase === "show" && !reduced;
  return (
    <div className="hero-swing" style={{ left: `${x}%` }} aria-hidden>
      <div className="hero-rig" ref={rig}>
        <span className="hero-thread" ref={thread} style={{ height: base }} />
        <div className="hero-body" ref={body} style={{ top: base }}>
          <span className="hero-holder" style={{ transform: `translate(${dx}px, ${dy}px)` }}>
            <HeroSprite look={look} size={SIZE} pose="swing" />
          </span>
          {showFx && s.extra === "webshot" && <span key={`w${stunt}`} className="hero-webshot" />}
          {showFx && s.extra === "flash" && <span key={`f${stunt}`} className="hero-flash" />}
          {showFx && s.fx && (
            <span key={`fx${stunt}`} className={`hero-fx fx-${stunt}`}>
              {s.fx.map((f, i) => (
                <i key={i}>{f}</i>
              ))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
