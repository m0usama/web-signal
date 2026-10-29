"use client";

import type { Game, Profile } from "@/lib/types";

export interface HuntGuess {
  x: number;
  y: number;
  hint: Hint;
}
export type Hint = "FOUND" | "BURNING" | "HOT" | "WARM" | "COOL" | "COLD";

export const HINT_STYLE: Record<Hint, { color: string; label: string }> = {
  FOUND: { color: "#3FD08A", label: "FOUND IT! 🎯" },
  BURNING: { color: "#E2223B", label: "BURNING 🔥🔥" },
  HOT: { color: "#FF705C", label: "HOT 🔥" },
  WARM: { color: "#FFB347", label: "WARM" },
  COOL: { color: "#6FA8FF", label: "COOL" },
  COLD: { color: "#1F4FE0", label: "COLD ❄️" },
};

export function huntState(g: Game | undefined) {
  const st = (g?.state ?? {}) as { guesses?: HuntGuess[]; max?: number; spot?: { x: number; y: number } };
  return { guesses: st.guesses ?? [], max: st.max ?? 10, spot: st.spot ?? null };
}

const HIDE_KEY = (id: string) => `ws-hide-${id}`;
export function rememberHide(id: string, x: number, y: number) {
  try {
    localStorage.setItem(HIDE_KEY(id), JSON.stringify({ x, y }));
  } catch {
    /* storage blocked */
  }
}
export function recallHide(id: string): { x: number; y: number } | null {
  try {
    const v = localStorage.getItem(HIDE_KEY(id));
    return v ? (JSON.parse(v) as { x: number; y: number }) : null;
  } catch {
    return null;
  }
}

/** SPIDER-SENSE ANTENNA — hide a secret spot on the map, the other senses it out. */
export function HotCold({
  game,
  me,
  partner,
  onHide,
  onSeek,
}: {
  game: Game | undefined;
  me: Profile;
  partner: Profile;
  /** Close the sheet and let me tap the map to hide a spot. */
  onHide: () => void;
  /** Close the sheet and let me tap the map to guess. */
  onSeek: () => void;
}) {
  const g = game && game.winner !== "void" ? game : undefined;
  const { guesses, max, spot } = huntState(g);
  const iHid = !!g && g.x_player === me.id;
  const live = !!g && !g.winner;
  const last = guesses[guesses.length - 1];

  return (
    <div className="quest-game">
      {!g && (
        <p className="fine center">
          Tap anywhere on the map to hide a secret spot. {partner.display_name} gets {max} tries to find it with WARMER / COLDER hints.
        </p>
      )}

      {g && g.winner && (
        <>
          <p className="trivia-big">{g.winner === "O" ? "🎯" : "🕵️"}</p>
          <p className="ttt-status lcd">
            {g.winner === "O"
              ? iHid
                ? `${partner.display_name} FOUND IT IN ${guesses.length}!`
                : `FOUND IN ${guesses.length}! 🏆 +3`
              : iHid
                ? "THEY NEVER FOUND IT — YOU WIN! 🏆 +3"
                : "OUT OF TRIES — IT WAS HIDDEN WELL"}
          </p>
          {spot && <p className="fine center">The secret spot is shown on the map with a 🎯.</p>}
        </>
      )}

      {live && !iHid && (
        <>
          <p className="ttt-status lcd">{partner.display_name} HID A SPOT — FIND IT!</p>
          {last && (
            <p className="hint-big" style={{ color: HINT_STYLE[last.hint].color }}>
              {HINT_STYLE[last.hint].label}
            </p>
          )}
          <p className="fine center">
            {max - guesses.length} tries left. Each tap on the map tells you how close you are.
          </p>
          <button type="button" className="btn btn-coral wide" onClick={onSeek}>
            📡 SENSE ON THE MAP
          </button>
        </>
      )}

      {live && iHid && (
        <>
          <p className="ttt-status lcd">HIDDEN! {partner.display_name} IS SEARCHING…</p>
          <p className="fine center">
            {guesses.length} / {max} tries used{last ? ` · last one: ${HINT_STYLE[last.hint].label}` : ""}
          </p>
        </>
      )}

      {guesses.length > 0 && (
        <ol className="hunt-list">
          {guesses.map((gs, i) => (
            <li key={i} style={{ color: HINT_STYLE[gs.hint].color }}>
              #{i + 1} {HINT_STYLE[gs.hint].label}
            </li>
          ))}
        </ol>
      )}

      {(!g || g.winner || iHid) && (
        <button type="button" className={g && live ? "link-btn" : "btn btn-coral wide"} onClick={onHide}>
          {g && live ? "HIDE A NEW SPOT INSTEAD" : "📡 HIDE A SPOT"}
        </button>
      )}
    </div>
  );
}
