"use client";

import { useState } from "react";
import type { Game, Profile } from "@/lib/types";
import { useAction } from "./Common";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** CANDY CRATER — Secret Word: one sets a word, the other guesses letters before the web snaps. */
export function WordGuess({
  game,
  me,
  partner,
  onNew,
  onGuess,
}: {
  game: Game | undefined;
  me: Profile;
  partner: Profile;
  onNew: (word: string) => Promise<unknown>;
  onGuess: (gameId: string, letter: string) => Promise<unknown>;
}) {
  const { busy, error, run } = useAction();
  const [word, setWord] = useState("");
  const [setting, setSetting] = useState(false);
  const g = game && game.winner !== "void" ? game : undefined;
  const st = (g?.state ?? {}) as { guessed?: string; misses?: number; max?: number; word?: string };
  const iAmSetter = !!g && g.x_player === me.id;
  const myTurn = !!g && !g.winner && g.turn === me.id;
  const misses = st.misses ?? 0;
  const max = st.max ?? 6;
  const guessed = st.guessed ?? "";

  const startForm = (
    <form
      className="word-form"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          await onNew(word);
          setWord("");
          setSetting(false);
        });
      }}
    >
      <label className="field-label">
        YOUR SECRET WORD (THEY WON&apos;T SEE IT)
        <input
          className="field"
          value={word}
          onChange={(e) => setWord(e.target.value.toUpperCase().replace(/[^A-Z ]/g, "").slice(0, 16))}
          placeholder="e.g. ROOFTOP"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-label="Secret word"
        />
      </label>
      <button type="submit" className="btn btn-coral wide" disabled={busy || word.replace(/ /g, "").length < 3}>
        🍬 HIDE IT IN THE CRATER
      </button>
    </form>
  );

  if (!g || (g.winner && setting)) {
    return (
      <div className="quest-game">
        <p className="fine center">Pick a word (3–16 letters). {partner.display_name} guesses letters; {max} wrong guesses and the web snaps.</p>
        {startForm}
        {error && <p className="form-error">{error}</p>}
      </div>
    );
  }

  let status = "";
  if (g.winner) {
    const guesserWon = g.winner === "O";
    status = guesserWon
      ? iAmSetter
        ? `${partner.display_name} CRACKED IT!`
        : "YOU CRACKED IT! 🏆 +3"
      : iAmSetter
        ? "THE WEB SNAPPED — YOU WIN! 🏆 +3"
        : "THE WEB SNAPPED!";
  } else status = myTurn ? "GUESS A LETTER" : `${partner.display_name} IS GUESSING…`;

  return (
    <div className="quest-game">
      <WebThread misses={misses} max={max} />
      <div className="word-tiles" aria-label={`Word: ${g.board.replace(/_/g, " blank ")}`}>
        {(g.winner && st.word ? st.word : g.board).split("").map((ch, i) =>
          ch === " " ? (
            <span key={i} className="word-gap" />
          ) : (
            <span key={i} className={`word-tile ${g.board[i] === "_" ? (g.winner ? "missed" : "") : "on"}`}>
              {ch === "_" ? "" : ch}
            </span>
          ),
        )}
      </div>
      <p className="ttt-status lcd" aria-live="polite">
        {status} · {max - misses} STRANDS LEFT
      </p>
      {!iAmSetter && !g.winner && (
        <div className="keyboard" role="group" aria-label="Letters">
          {LETTERS.map((l) => {
            const used = guessed.includes(l);
            const hit = used && g.board.includes(l);
            return (
              <button
                key={l}
                type="button"
                className={`key ${used ? (hit ? "hit" : "miss") : ""}`}
                disabled={!myTurn || used || busy}
                onClick={() => run(() => onGuess(g.id, l))}
                aria-label={`Letter ${l}`}
              >
                {l}
              </button>
            );
          })}
        </div>
      )}
      {iAmSetter && !g.winner && (
        <p className="fine center">
          Guessed so far: {guessed ? guessed.split("").join(" ") : "nothing yet"}
        </p>
      )}
      {error && <p className="form-error">{error}</p>}
      {g.winner && (
        <button type="button" className="btn btn-coral wide" onClick={() => setSetting(true)}>
          ▶ SET A NEW WORD
        </button>
      )}
    </div>
  );
}

/** A dangling pixel spider whose thread loses a strand per miss. */
function WebThread({ misses, max }: { misses: number; max: number }) {
  const left = Math.max(0, max - misses);
  return (
    <div className={`web-thread ${left === 0 ? "snapped" : ""}`} aria-hidden>
      <div className="strands">
        {Array.from({ length: max }, (_, i) => (
          <i key={i} className={i < left ? "on" : "off"} />
        ))}
      </div>
      <span className="thread-spider">🕷</span>
    </div>
  );
}
