"use client";

import { useEffect, useState } from "react";
import type { Game, Profile } from "@/lib/types";
import { Icon } from "../Icon";
import { Players, useAction } from "./Common";

const FACES: Record<string, string> = { a: "heart", b: "star", c: "zap", d: "moon", e: "coffee", f: "cat", g: "pizza", h: "pigeon" };

interface MemState {
  scores?: Record<string, number>;
  pending?: number;
  peek?: { t: number; v: string };
  miss?: { a: number; b: number; va: string; vb: string };
  hit?: [number, number];
}

/** PIGEON HQ — Pigeon Pairs: flip two cards, keep going while you match. */
export function Memory({
  game,
  me,
  partner,
  onNew,
  onFlip,
}: {
  game: Game | undefined;
  me: Profile;
  partner: Profile;
  onNew: () => Promise<unknown>;
  onFlip: (gameId: string, tile: number) => Promise<unknown>;
}) {
  const { busy, error, run } = useAction();
  const g = game && game.winner !== "void" ? game : undefined;
  const st = (g?.state ?? {}) as MemState;
  const myTurn = !!g && !g.winner && g.turn === me.id;
  const myScore = st.scores?.[me.id] ?? 0;
  const theirScore = st.scores?.[partner.id] ?? 0;

  // Show a missed pair face-up for a moment so both of you can remember it.
  const [missShown, setMissShown] = useState<string | null>(null);
  const missKey = st.miss && g ? `${g.id}:${g.updated_at}` : null;
  useEffect(() => {
    if (!missKey) return;
    setMissShown(missKey);
    const t = setTimeout(() => setMissShown(null), 1800);
    return () => clearTimeout(t);
  }, [missKey]);

  const face = (i: number): string | null => {
    if (!g) return null;
    const c = g.board[i];
    if (c && c !== ".") return c;
    if (st.peek?.t === i) return st.peek.v;
    if (st.miss && missShown === missKey) {
      if (st.miss.a === i) return st.miss.va;
      if (st.miss.b === i) return st.miss.vb;
    }
    return null;
  };

  let status = "FIND THE MATCHING PAIRS — MOST PAIRS WINS";
  if (g) {
    const iWin = (g.winner === "X" && g.x_player === me.id) || (g.winner === "O" && g.o_player === me.id);
    if (g.winner === "draw") status = `DRAW ${myScore}–${theirScore}`;
    else if (g.winner) status = iWin ? `YOU WIN ${myScore}–${theirScore}! 🏆 +3` : `${partner.display_name} WINS ${theirScore}–${myScore}`;
    else if (myTurn) status = st.pending !== undefined ? "NOW FLIP ITS PAIR…" : st.hit ? "MATCH! GO AGAIN" : "YOUR TURN — FLIP A CARD";
    else status = `${partner.display_name} IS FLIPPING…`;
  }

  return (
    <div className="quest-game">
      {g && (
        <Players me={me} partner={partner} meMark={<b>{myScore}</b>} theirMark={<b>{theirScore}</b>} turnIsMine={myTurn} over={!!g.winner} />
      )}
      <div className="mem-grid" role="grid" aria-label="Pigeon pairs">
        {Array.from({ length: 16 }, (_, i) => {
          const f = face(i);
          const matched = !!g && g.board[i] !== ".";
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              className={`mem-card ${f ? "up" : ""} ${matched ? "matched" : ""}`}
              disabled={!myTurn || busy || !!f}
              onClick={() => g && run(() => onFlip(g.id, i))}
              aria-label={f ? `Card ${i + 1}: ${FACES[f]}` : `Card ${i + 1}, face down`}
            >
              {f ? <Icon name={FACES[f]} size={30} /> : <span className="mem-back">🐦</span>}
            </button>
          );
        })}
      </div>
      <p className="ttt-status lcd" aria-live="polite">
        {status}
      </p>
      {error && <p className="form-error">{error}</p>}
      {(!g || g.winner) && (
        <button type="button" className="btn btn-coral wide" disabled={busy} onClick={() => run(onNew)}>
          {g ? "▶ NEW BOARD" : "▶ DEAL THE CARDS"}
        </button>
      )}
    </div>
  );
}
