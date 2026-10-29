"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { winningLine } from "@/lib/spark";
import type { Game, Profile } from "@/lib/types";
import type { DoodleEvent } from "@/lib/useRoom";
import { Avatar } from "./Avatar";

// ------------------------------------------------------------------ rooftop tic-tac-toe

export function TicTacToe({
  game,
  me,
  partner,
  onNew,
  onMove,
}: {
  game: Game | null;
  me: Profile;
  partner: Profile;
  onNew: () => Promise<void>;
  onMove: (cell: number) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = game && game.winner !== "void" ? game : null;
  const myMark = active ? (active.x_player === me.id ? "X" : "O") : null;
  const myTurn = !!active && !active.winner && active.turn === me.id;
  const line = active ? winningLine(active.board) : null;

  let status = "START A GAME ON THE ROOFTOPS";
  if (active) {
    if (active.winner === "draw") status = "DRAW! REMATCH?";
    else if (active.winner) status = active.winner === myMark ? "YOU WIN! 🏆" : `${partner.display_name} WINS!`;
    else status = myTurn ? "YOUR MOVE" : `WAITING FOR ${partner.display_name}…`;
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      const m = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? "");
      setError(m.includes("NOT_YOUR_TURN") ? "NOT YOUR TURN YET" : m.includes("BAD_MOVE") ? "THAT SQUARE'S TAKEN" : "GLITCH — TRY AGAIN");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ttt">
      <div className="ttt-head">
        <span className="lcd">🏙 ROOFTOP TIC-TAC-TOE</span>
      </div>
      {active && (
        <div className="ttt-players">
          <span className={active.turn === active.x_player ? "on" : ""}>
            <Avatar avatarKey={active.x_player === me.id ? me.avatar_key : partner.avatar_key} size={22} /> X
          </span>
          <span className={active.turn === active.o_player ? "on" : ""}>
            O <Avatar avatarKey={active.o_player === me.id ? me.avatar_key : partner.avatar_key} size={22} />
          </span>
        </div>
      )}
      <div className={`ttt-board ${myTurn ? "my-turn" : ""}`} role="grid" aria-label="Tic-tac-toe board">
        {Array.from({ length: 9 }, (_, i) => {
          const c = active ? active.board[i] : ".";
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              className={`ttt-cell mark-${c} ${line?.includes(i) ? "win" : ""}`}
              disabled={!myTurn || c !== "." || busy}
              onClick={() => run(() => onMove(i))}
              aria-label={c === "." ? `Square ${i + 1}, empty` : `Square ${i + 1}, ${c}`}
            >
              {c === "X" ? "✕" : c === "O" ? "◯" : ""}
            </button>
          );
        })}
      </div>
      <p className="ttt-status lcd" aria-live="polite">
        {status}
      </p>
      {error && <p className="form-error">{error}</p>}
      {(!active || active.winner) && (
        <button type="button" className="btn btn-coral wide" disabled={busy} onClick={() => run(onNew)}>
          {active ? "▶ REMATCH" : "▶ NEW GAME"}
        </button>
      )}
      {active && !active.winner && (
        <button type="button" className="link-btn" disabled={busy} onClick={() => run(onNew)}>
          START OVER
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ live doodle pad

const COLORS = ["#F8F5FF", "#FF65AD", "#A75CFF", "#FFB347", "#3FD08A", "#169FE8", "#FF705C", "#10101E"];
const SIZES = [3, 7, 14];

export interface DoodleBus {
  log: DoodleEvent[];
  subscribe: (fn: (e: DoodleEvent) => void) => () => void;
  send: (e: DoodleEvent) => void;
}

function drawStroke(ctx: CanvasRenderingContext2D, e: Extract<DoodleEvent, { t: "stroke" }>, w: number, h: number) {
  const p = e.pts;
  if (p.length < 2) return;
  ctx.strokeStyle = e.color;
  ctx.lineWidth = (e.size * w) / 320;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(p[0] * w, p[1] * h);
  if (p.length === 2) ctx.lineTo(p[0] * w + 0.1, p[1] * h + 0.1);
  for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i] * w, p[i + 1] * h);
  ctx.stroke();
}

export function Doodle({ bus, partnerName, onSendImage }: { bus: DoodleBus; partnerName: string; onSendImage: (file: File) => Promise<void> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(COLORS[1]);
  const [size, setSize] = useState(SIZES[1]);
  const [sending, setSending] = useState(false);
  const [partnerDrawing, setPartnerDrawing] = useState(false);
  const drawing = useRef<{ id: string; pts: number[]; sent: number } | null>(null);
  const flush = useRef<ReturnType<typeof setInterval> | null>(null);
  const partnerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ctx = () => canvasRef.current?.getContext("2d") ?? null;

  const redraw = () => {
    const c = canvasRef.current;
    const g = ctx();
    if (!c || !g) return;
    g.fillStyle = "#0C2552";
    g.fillRect(0, 0, c.width, c.height);
    for (const e of bus.log) {
      if (e.t === "clear") {
        g.fillRect(0, 0, c.width, c.height);
      } else drawStroke(g, e, c.width, c.height);
    }
  };

  // Size the canvas to its box (sharp on retina) and replay what's been drawn.
  useLayoutEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const resize = () => {
      const side = c.clientWidth;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(side * dpr);
      c.height = Math.round(side * dpr);
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () =>
      bus.subscribe((e) => {
        const c = canvasRef.current;
        const g = ctx();
        if (!c || !g) return;
        if (e.t === "clear") redraw();
        else drawStroke(g, e, c.width, c.height);
        setPartnerDrawing(true);
        if (partnerTimer.current) clearTimeout(partnerTimer.current);
        partnerTimer.current = setTimeout(() => setPartnerDrawing(false), 1200);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bus],
  );

  useEffect(
    () => () => {
      if (flush.current) clearInterval(flush.current);
      if (partnerTimer.current) clearTimeout(partnerTimer.current);
    },
    [],
  );

  const point = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };

  /** Sends the newest part of the current stroke (overlapping by one point so it joins up). */
  const sendPending = () => {
    const d = drawing.current;
    if (!d || d.pts.length <= d.sent) return;
    const from = Math.max(0, d.sent - 2);
    const chunk = d.pts.slice(from).map((v) => Math.round(v * 1000) / 1000);
    d.sent = d.pts.length;
    const ev: DoodleEvent = { t: "stroke", id: d.id, color, size, pts: chunk };
    bus.log.push(ev);
    bus.send(ev);
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current = { id: crypto.randomUUID(), pts: point(e), sent: 0 };
    const c = canvasRef.current!;
    drawStroke(ctx()!, { t: "stroke", id: "", color, size, pts: drawing.current.pts }, c.width, c.height);
    flush.current = setInterval(sendPending, 70);
  };

  const move = (e: React.PointerEvent) => {
    const d = drawing.current;
    if (!d) return;
    const [x, y] = point(e);
    const c = canvasRef.current!;
    const lx = d.pts[d.pts.length - 2];
    const ly = d.pts[d.pts.length - 1];
    d.pts.push(x, y);
    drawStroke(ctx()!, { t: "stroke", id: "", color, size, pts: [lx, ly, x, y] }, c.width, c.height);
  };

  const up = () => {
    if (flush.current) clearInterval(flush.current);
    flush.current = null;
    sendPending();
    drawing.current = null;
  };

  return (
    <div className="doodle">
      <div className="ttt-head">
        <span className="lcd">🖍 LIVE DOODLE</span>
        <span className={`doodle-live ${partnerDrawing ? "on" : ""}`}>{partnerDrawing ? `${partnerName} IS DRAWING…` : "DRAW TOGETHER"}</span>
      </div>
      <canvas
        ref={canvasRef}
        className="doodle-canvas"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        aria-label="Shared drawing pad"
      />
      <div className="doodle-tools">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch ${color === c ? "on" : ""}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            aria-label={`Colour ${c}`}
            aria-pressed={color === c}
          />
        ))}
      </div>
      <div className="row-between gap">
        <div className="seg">
          {SIZES.map((s) => (
            <button key={s} type="button" className={size === s ? "on" : ""} onClick={() => setSize(s)} aria-pressed={size === s} aria-label={`Brush ${s}`}>
              <span className="brush-dot" style={{ width: s + 2, height: s + 2 }} />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-mini"
          onClick={() => {
            const ev: DoodleEvent = { t: "clear" };
            bus.log.push(ev);
            bus.send(ev);
            redraw();
          }}
        >
          CLEAR
        </button>
        <button
          type="button"
          className="btn btn-orange btn-mini"
          disabled={sending}
          onClick={async () => {
            const c = canvasRef.current;
            if (!c) return;
            setSending(true);
            try {
              const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
              if (blob) await onSendImage(new File([blob], "doodle.png", { type: "image/png" }));
            } finally {
              setSending(false);
            }
          }}
        >
          {sending ? "SENDING…" : "SEND TO CHAT"}
        </button>
      </div>
    </div>
  );
}
