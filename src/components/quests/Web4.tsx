"use client";

import { web4Line } from "@/lib/quests-data";
import type { Game, Profile } from "@/lib/types";
import { Players, useAction } from "./Common";

/** ROOFTOP 23 — Web Four: drop web-balls, four in a row wins. */
export function Web4({
  game,
  me,
  partner,
  onNew,
  onMove,
}: {
  game: Game | undefined;
  me: Profile;
  partner: Profile;
  onNew: () => Promise<unknown>;
  onMove: (gameId: string, col: number) => Promise<unknown>;
}) {
  const { busy, error, run } = useAction();
  const g = game && game.winner !== "void" ? game : undefined;
  const myMark = g ? (g.x_player === me.id ? "X" : "O") : "X";
  const myTurn = !!g && !g.winner && g.turn === me.id;
  const line = g ? web4Line(g.board) : null;
  const last = (g?.state as { last?: number } | undefined)?.last;

  let status = "FIRST TO FOUR IN A ROW WINS";
  if (g) {
    if (g.winner === "draw") status = "IT'S A DRAW — REMATCH?";
    else if (g.winner) status = g.winner === myMark ? "YOU WIN! 🏆 +3" : `${partner.display_name} WINS!`;
    else status = myTurn ? "YOUR MOVE — TAP A COLUMN" : `WAITING FOR ${partner.display_name}…`;
  }

  const disc = (mark: string) => <span className={`w4-disc mini ${mark === "X" ? "red" : "blue"}`} />;

  return (
    <div className="quest-game">
      {g && (
        <Players
          me={me}
          partner={partner}
          meMark={disc(myMark)}
          theirMark={disc(myMark === "X" ? "O" : "X")}
          turnIsMine={myTurn}
          over={!!g.winner}
        />
      )}
      <div className={`w4-board ${myTurn ? "my-turn" : ""}`} role="grid" aria-label="Web Four board">
        {Array.from({ length: 7 }, (_, col) => (
          <button
            key={col}
            type="button"
            className="w4-col"
            disabled={!myTurn || busy || !g || g.board[col] !== "."}
            onClick={() => g && run(() => onMove(g.id, col))}
            aria-label={`Drop in column ${col + 1}`}
          >
            {Array.from({ length: 6 }, (_, row) => {
              const i = row * 7 + col;
              const c = g ? g.board[i] : ".";
              return (
                <span key={row} className={`w4-cell ${line?.includes(i) ? "win" : ""}`}>
                  {c !== "." && <span className={`w4-disc ${c === "X" ? "red" : "blue"} ${i === last ? "drop" : ""}`} style={{ "--row": row } as React.CSSProperties} />}
                </span>
              );
            })}
          </button>
        ))}
      </div>
      <p className="ttt-status lcd" aria-live="polite">
        {status}
      </p>
      {error && <p className="form-error">{error}</p>}
      {(!g || g.winner) && (
        <button type="button" className="btn btn-coral wide" disabled={busy} onClick={() => run(onNew)}>
          {g ? "▶ REMATCH" : "▶ NEW GAME"}
        </button>
      )}
      {g && !g.winner && (
        <button type="button" className="link-btn" disabled={busy} onClick={() => run(onNew)}>
          START OVER
        </button>
      )}
    </div>
  );
}
