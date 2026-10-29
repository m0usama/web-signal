"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dayNumber } from "@/lib/quests-data";
import { synth } from "@/lib/sound";
import type { Profile, RaceRun } from "@/lib/types";
import { Avatar } from "../Avatar";
import { useAction } from "./Common";

const W = 360;
const H = 480;
const GROUND = 430;
const GRAVITY = 900;
const RANGE = 200;
const FALL_PENALTY = 2000;

interface Anchor {
  x: number;
  y: number;
}
interface Course {
  anchors: Anchor[];
  buildings: { x: number; w: number; top: number; hue: number }[];
  finishX: number;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Same course for both of you on a given day. */
export function makeCourse(day: string): Course {
  const r = rng(dayNumber(day) * 7919 + 11);
  const anchors: Anchor[] = [];
  let x = 120;
  for (let i = 0; i < 14; i++) {
    anchors.push({ x, y: 50 + r() * 70 });
    x += 115 + r() * 45;
  }
  const finishX = anchors[anchors.length - 1].x + 150;
  const buildings: Course["buildings"] = [];
  for (let bx = -40; bx < finishX + 400; ) {
    const w = 40 + r() * 50;
    buildings.push({ x: bx, w, top: 250 + r() * 130, hue: r() });
    bx += w + 6 + r() * 14;
  }
  return { anchors, buildings, finishX };
}

type Phase = "ready" | "countdown" | "run" | "done";

interface Sim {
  px: number;
  py: number;
  vx: number;
  vy: number;
  attached: number | null;
  len: number;
  theta: number;
  omega: number;
  lastAnchor: number;
  penalty: number;
  falls: number;
  start: number;
  trail: [number, number][];
}

function newSim(c: Course): Sim {
  const a = c.anchors[0];
  const len = 110;
  const theta = -1.05;
  return {
    px: a.x + len * Math.sin(theta),
    py: a.y + len * Math.cos(theta),
    vx: 0,
    vy: 0,
    attached: 0,
    len,
    theta,
    omega: 0,
    lastAnchor: 0,
    penalty: 0,
    falls: 0,
    start: 0,
    trail: [],
  };
}

export function formatMs(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`;
}

/** SIGNAL BRIDGE — Web-Swing Race. Tap to let go, tap again to shoot a web. */
export function Race({
  day,
  runs,
  me,
  partner,
  onSubmit,
}: {
  day: string;
  runs: RaceRun[];
  me: Profile;
  partner: Profile;
  onSubmit: (ms: number) => Promise<unknown>;
}) {
  const course = useMemo(() => makeCourse(day), [day]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Sim>(newSim(course));
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [count, setCount] = useState(3);
  const [result, setResult] = useState<{ ms: number; falls: number } | null>(null);
  const { busy, error, run } = useAction();

  const myBest = runs.filter((r) => r.user_id === me.id && r.day === day).reduce((m, r) => Math.min(m, r.ms), Infinity);
  const theirBest = runs.filter((r) => r.user_id === partner.id && r.day === day).reduce((m, r) => Math.min(m, r.ms), Infinity);

  const setP = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // ------------------------------------------------------------ drawing
  const draw = useCallback(
    (now: number) => {
      const c = canvasRef.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) return;
      const s = sim.current;
      const scale = c.width / W;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.imageSmoothingEnabled = false;
      const camX = Math.max(0, Math.min(course.finishX - W + 80, s.px - W * 0.38));

      // sky
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#060a24");
      g.addColorStop(1, "#132e8c");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,241,243,0.7)";
      for (let i = 0; i < 40; i++) {
        const sx = (((i * 97) % 997) - camX * 0.15 + 2000) % (W + 20);
        const sy = (i * 53) % 220;
        ctx.fillRect(sx, sy, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
      }

      // far skyline (parallax)
      ctx.fillStyle = "#0b1240";
      for (let i = 0; i < 18; i++) {
        const bx = ((i * 61 - camX * 0.35) % (W + 120) + W + 120) % (W + 120) - 60;
        const top = 300 + ((i * 37) % 70);
        ctx.fillRect(bx, top, 44, H - top);
      }

      ctx.save();
      ctx.translate(-camX, 0);
      // buildings
      for (const b of course.buildings) {
        if (b.x + b.w < camX - 10 || b.x > camX + W + 10) continue;
        ctx.fillStyle = b.hue > 0.5 ? "#1f4fe0" : "#8e0f24";
        ctx.fillRect(b.x, b.top, b.w, H - b.top);
        ctx.fillStyle = b.hue > 0.5 ? "#6fa8ff" : "#ff6b7a";
        for (let wy = b.top + 10; wy < GROUND; wy += 16)
          for (let wx = b.x + 6; wx < b.x + b.w - 8; wx += 12) if (((wx * 7 + wy * 3) | 0) % 5 !== 0) ctx.fillRect(wx, wy, 5, 7);
      }
      // street + danger line
      ctx.fillStyle = "#060a24";
      ctx.fillRect(camX - 10, GROUND, W + 20, H - GROUND);
      ctx.fillStyle = "#e2223b";
      for (let x = Math.floor(camX / 20) * 20; x < camX + W + 20; x += 20) ctx.fillRect(x, GROUND, 10, 3);

      // finish
      for (let y = 0; y < GROUND; y += 10)
        for (let k = 0; k < 2; k++) {
          ctx.fillStyle = (y / 10 + k) % 2 ? "#fff1f3" : "#060a24";
          ctx.fillRect(course.finishX + k * 6, y, 6, 10);
        }

      // anchors
      course.anchors.forEach((a, i) => {
        const inRange = s.attached === null && a.x > s.px - 30 && Math.hypot(a.x - s.px, a.y - s.py) < RANGE;
        ctx.fillStyle = i <= s.lastAnchor ? "#6fa8ff" : "#fff1f3";
        ctx.fillRect(a.x - 3, a.y - 3, 6, 6);
        if (inRange) {
          ctx.strokeStyle = `rgba(255,201,60,${0.5 + 0.5 * Math.sin(now / 90)})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(a.x - 8, a.y - 8, 16, 16);
        }
      });

      // trail
      s.trail.forEach(([tx, ty], i) => {
        ctx.fillStyle = `rgba(226,34,59,${(i / s.trail.length) * 0.5})`;
        ctx.fillRect(tx - 2, ty - 2, 4, 4);
      });

      // web line
      if (s.attached !== null) {
        const a = course.anchors[s.attached];
        ctx.strokeStyle = "#fff1f3";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(s.px, s.py);
        ctx.stroke();
      }

      // swinger (pixel hero: red suit, white eyes)
      ctx.fillStyle = "#e2223b";
      ctx.fillRect(s.px - 6, s.py - 7, 12, 12);
      ctx.fillStyle = "#1f4fe0";
      ctx.fillRect(s.px - 6, s.py + 3, 12, 4);
      ctx.fillStyle = "#fff1f3";
      ctx.fillRect(s.px - 4, s.py - 4, 3, 3);
      ctx.fillRect(s.px + 1, s.py - 4, 3, 3);
      ctx.restore();

      // HUD
      if (phaseRef.current === "run" || phaseRef.current === "done") {
        const t = (phaseRef.current === "done" && result ? result.ms : now - s.start + s.penalty) / 1000;
        ctx.fillStyle = "rgba(6,10,36,0.75)";
        ctx.fillRect(8, 8, 118, 26);
        ctx.fillStyle = "#fff1f3";
        ctx.font = "700 16px monospace";
        ctx.fillText(`${t.toFixed(2)}s`, 16, 27);
        const progress = Math.min(1, s.px / course.finishX);
        ctx.fillStyle = "rgba(6,10,36,0.75)";
        ctx.fillRect(W - 128, 14, 120, 10);
        ctx.fillStyle = "#e2223b";
        ctx.fillRect(W - 126, 16, 116 * progress, 6);
      }
    },
    [course, result],
  );

  // ------------------------------------------------------------ physics
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (dt: number) => {
      const s = sim.current;
      if (s.attached !== null) {
        const a = course.anchors[s.attached];
        const alpha = -(GRAVITY / s.len) * Math.sin(s.theta);
        s.omega = s.omega + alpha * dt;
        s.theta += s.omega * dt;
        s.px = a.x + s.len * Math.sin(s.theta);
        s.py = a.y + s.len * Math.cos(s.theta);
        s.vx = s.len * s.omega * Math.cos(s.theta);
        s.vy = -s.len * s.omega * Math.sin(s.theta);
      } else {
        s.vy += GRAVITY * dt;
        s.px += s.vx * dt;
        s.py += s.vy * dt;
      }
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      const s = sim.current;
      if (phaseRef.current === "run") {
        for (let k = 0; k < 4; k++) step(dt / 4);
        s.trail.push([s.px, s.py]);
        if (s.trail.length > 14) s.trail.shift();
        if (s.py > GROUND - 4) {
          // fell: back to the last web point, with a penalty
          const keep = { penalty: s.penalty + FALL_PENALTY, falls: s.falls + 1, start: s.start, lastAnchor: s.lastAnchor };
          const a = course.anchors[keep.lastAnchor];
          Object.assign(s, newSim(course), keep, { attached: keep.lastAnchor, theta: -1.05, omega: 0 });
          s.px = a.x + s.len * Math.sin(s.theta);
          s.py = a.y + s.len * Math.cos(s.theta);
          synth.play("ghost");
          if (navigator.vibrate) navigator.vibrate(60);
        }
        if (s.px >= course.finishX) {
          const ms = Math.round(now - s.start + s.penalty);
          setResult({ ms, falls: s.falls });
          setP("done");
          synth.play("badge");
        }
      }
      draw(now);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [course, draw]);

  // Sharp canvas on retina.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round((c.clientWidth * H * dpr) / W);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  const start = () => {
    sim.current = newSim(course);
    setResult(null);
    setCount(3);
    setP("countdown");
    void synth.unlock();
    let n = 3;
    const tick = () => {
      n -= 1;
      if (n > 0) {
        setCount(n);
        synth.play("send", true);
        setTimeout(tick, 650);
      } else {
        sim.current.start = performance.now();
        setP("run");
        synth.play("poke", true);
      }
    };
    synth.play("send", true);
    setTimeout(tick, 650);
  };

  const action = () => {
    if (phaseRef.current !== "run") return;
    const s = sim.current;
    if (s.attached !== null) {
      s.attached = null; // let go, keep momentum
      return;
    }
    // shoot a web at the nearest point ahead in range
    let best = -1;
    let bestD = Infinity;
    course.anchors.forEach((a, i) => {
      if (a.x < s.px - 30) return;
      const d = Math.hypot(a.x - s.px, a.y - s.py);
      if (d < RANGE && d < bestD && a.y < s.py) {
        best = i;
        bestD = d;
      }
    });
    if (best < 0) return;
    const a = course.anchors[best];
    s.attached = best;
    s.lastAnchor = Math.max(s.lastAnchor, best);
    s.len = Math.max(60, Math.min(RANGE, bestD));
    s.theta = Math.atan2(s.px - a.x, s.py - a.y);
    // Carry momentum into the swing, but always enough to swing up to ~66° ahead
    // (so a weak release never leaves you stuck).
    const carried = (s.vx * Math.cos(s.theta) - s.vy * Math.sin(s.theta)) / s.len;
    const minimum = Math.sqrt(Math.max(0, (2 * GRAVITY * (Math.cos(s.theta) - Math.cos(1.15))) / s.len)) || 2;
    s.omega = Math.max(carried, minimum);
    if (navigator.vibrate) navigator.vibrate(12);
  };

  return (
    <div className="quest-game race">
      <div className="race-board">
        <span className="race-time">
          <Avatar avatarKey={me.avatar_key} size={18} /> {Number.isFinite(myBest) ? formatMs(myBest) : "—"}
        </span>
        <span className="lcd small">TODAY&apos;S BEST</span>
        <span className="race-time">
          {Number.isFinite(theirBest) ? formatMs(theirBest) : "—"} <Avatar avatarKey={partner.avatar_key} size={18} />
        </span>
      </div>
      <div className="race-stage">
        <canvas
          ref={canvasRef}
          className="race-canvas"
          onPointerDown={(e) => {
            e.preventDefault();
            action();
          }}
          aria-label="Web-swing race. Tap to let go, tap again to shoot a web."
        />
        {phase === "countdown" && <div className="race-overlay big">{count}</div>}
        {phase === "ready" && (
          <div className="race-overlay">
            <p className="lcd">SAME COURSE FOR BOTH OF YOU TODAY</p>
            <p className="fine">
              Swing, <b>tap</b> to let go, <b>tap</b> again to shoot a web at the glowing point ahead. Touch the street = +2s.
            </p>
            {Number.isFinite(theirBest) && <p className="lcd small">BEAT {partner.display_name}&apos;S {formatMs(theirBest)} FOR +3</p>}
            <button type="button" className="btn btn-coral" onClick={start}>
              ▶ SWING!
            </button>
          </div>
        )}
        {phase === "done" && result && (
          <div className="race-overlay">
            <p className="trivia-big">{formatMs(result.ms)}</p>
            <p className="lcd small">{result.falls ? `${result.falls} FALL${result.falls > 1 ? "S" : ""} (+${result.falls * 2}s)` : "CLEAN RUN!"}</p>
            {Number.isFinite(theirBest) && (
              <p className="ttt-status lcd">{result.ms < theirBest ? `YOU BEAT ${partner.display_name}! 🏆` : `${formatMs(result.ms - theirBest)} BEHIND ${partner.display_name}`}</p>
            )}
            {error && <p className="form-error">{error}</p>}
            <div className="row-between gap">
              <button type="button" className="btn btn-ghost" onClick={start} disabled={busy}>
                ↺ AGAIN
              </button>
              <button
                type="button"
                className="btn btn-coral"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await onSubmit(result.ms);
                    setP("ready");
                  })
                }
              >
                {busy ? "SAVING…" : "SAVE TIME ▸"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
