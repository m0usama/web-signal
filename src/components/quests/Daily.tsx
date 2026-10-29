"use client";

import { useMemo, useState } from "react";
import { scoreTrivia, syncPercent, thisOrThatFor, triviaFor, TRIVIA_PER_DAY } from "@/lib/quests-data";
import type { DailyAnswer, Profile } from "@/lib/types";
import { Avatar } from "../Avatar";
import { useAction } from "./Common";

const LETTER = ["A", "B", "C", "D"];

/** THE DAILY SIGNAL — five trivia questions a day, the same for both of you. */
export function Trivia({
  day,
  daily,
  partnerDone,
  me,
  partner,
  onSubmit,
}: {
  day: string;
  daily: DailyAnswer[];
  /** They've played today (their answers unlock once you have too). */
  partnerDone: boolean;
  me: Profile;
  partner: Profile;
  onSubmit: (answers: number[], score: number) => Promise<void>;
}) {
  const qs = useMemo(() => triviaFor(day), [day]);
  const mine = daily.find((d) => d.kind === "trivia" && d.user_id === me.id && d.day === day);
  const theirs = daily.find((d) => d.kind === "trivia" && d.user_id === partner.id && d.day === day);
  const [picks, setPicks] = useState<number[]>([]);
  const [reveal, setReveal] = useState<number | null>(null);
  const { busy, error, run } = useAction();

  if (mine) {
    return (
      <div className="quest-game">
        <div className="daily-score">
          <ScoreChip p={me} label="YOU" score={mine.score} total={qs.length} />
          {theirs ? (
            <ScoreChip p={partner} label={partner.display_name} score={theirs.score} total={qs.length} />
          ) : (
            <p className="lcd small">{partnerDone ? "LOADING THEIR SCORE…" : `WAITING FOR ${partner.display_name}…`}</p>
          )}
        </div>
        {theirs && (
          <p className="ttt-status lcd">
            {mine.score > theirs.score ? "YOU WIN TODAY'S TRIVIA 🏆" : mine.score < theirs.score ? `${partner.display_name} WINS TODAY` : "TIED — GREAT MINDS"}
          </p>
        )}
        <ol className="trivia-review">
          {qs.map((q, i) => (
            <li key={i}>
              <span className="tag">{q.tag}</span>
              <p>{q.q}</p>
              <p className="answer">✓ {q.options[q.answer]}</p>
              <p className="picks">
                <span className={mine.answers[i] === q.answer ? "ok" : "no"}>YOU: {q.options[mine.answers[i]] ?? "—"}</span>
                {theirs && (
                  <span className={theirs.answers[i] === q.answer ? "ok" : "no"}>
                    {partner.display_name}: {q.options[theirs.answers[i]] ?? "—"}
                  </span>
                )}
              </p>
            </li>
          ))}
        </ol>
        <p className="fine center">New questions every day at midnight.</p>
      </div>
    );
  }

  const i = picks.length;
  if (i >= qs.length) {
    const score = scoreTrivia(qs, picks);
    return (
      <div className="quest-game">
        <p className="trivia-big">
          {score}/{qs.length}
        </p>
        <p className="ttt-status lcd">{score === qs.length ? "PERFECT SIGNAL! 🕸" : score >= 3 ? "NICE SENSES!" : "THE WEB WOBBLED…"}</p>
        {error && <p className="form-error">{error}</p>}
        <button type="button" className="btn btn-coral wide" disabled={busy} onClick={() => run(() => onSubmit(picks, score))}>
          {busy ? "SENDING…" : "▶ LOCK IN MY SCORE"}
        </button>
      </div>
    );
  }

  const q = qs[i];
  return (
    <div className="quest-game">
      <div className="trivia-progress" aria-label={`Question ${i + 1} of ${qs.length}`}>
        {qs.map((_, k) => (
          <i key={k} className={k < i ? (picks[k] === qs[k].answer ? "ok" : "no") : k === i ? "now" : ""} />
        ))}
      </div>
      <span className="tag">{q.tag}</span>
      <p className="trivia-q">{q.q}</p>
      <div className="trivia-options">
        {q.options.map((o, k) => {
          const shown = reveal !== null;
          const cls = shown ? (k === q.answer ? "right" : k === reveal ? "wrong" : "dim") : "";
          return (
            <button
              key={k}
              type="button"
              className={`trivia-option ${cls}`}
              disabled={shown}
              onClick={() => {
                setReveal(k);
                setTimeout(() => {
                  setPicks((p) => [...p, k]);
                  setReveal(null);
                }, 900);
              }}
            >
              <b>{LETTER[k]}</b> {o}
            </button>
          );
        })}
      </div>
      <p className="fine center">
        {partnerDone || theirs ? `${partner.display_name} already played today — beat them!` : `Question ${i + 1} of ${TRIVIA_PER_DAY}`}
      </p>
    </div>
  );
}

function ScoreChip({ p, label, score, total }: { p: Profile; label: string; score: number; total: number }) {
  return (
    <div className="score-chip">
      <Avatar avatarKey={p.avatar_key} size={28} />
      <span className="lcd small">{label}</span>
      <b>
        {score}/{total}
      </b>
    </div>
  );
}

/** NIGHT-OWL DINER — This or That: eight quick picks, then see how in sync you are. */
export function ThisOrThat({
  day,
  daily,
  partnerDone,
  me,
  partner,
  onSubmit,
}: {
  day: string;
  daily: DailyAnswer[];
  partnerDone: boolean;
  me: Profile;
  partner: Profile;
  onSubmit: (answers: number[]) => Promise<void>;
}) {
  const pairs = useMemo(() => thisOrThatFor(day), [day]);
  const mine = daily.find((d) => d.kind === "tot" && d.user_id === me.id && d.day === day);
  const theirs = daily.find((d) => d.kind === "tot" && d.user_id === partner.id && d.day === day);
  const [picks, setPicks] = useState<number[]>([]);
  const { busy, error, run } = useAction();

  if (mine) {
    const pct = theirs ? syncPercent(mine.answers, theirs.answers) : null;
    return (
      <div className="quest-game">
        {pct === null ? (
          <p className="ttt-status lcd">LOCKED IN — WAITING FOR {partner.display_name}…</p>
        ) : (
          <>
            <div className="sync-meter" aria-label={`${pct}% in sync`}>
              <i style={{ width: `${pct}%` }} />
              <b>{pct}% IN SYNC</b>
            </div>
            <p className="ttt-status lcd">{pct >= 75 ? "SAME WAVELENGTH 💞" : pct >= 50 ? "PRETTY CLOSE!" : "OPPOSITES ATTRACT ⚡"}</p>
          </>
        )}
        <ul className="tot-review">
          {pairs.map((pair, i) => (
            <li key={i} className={theirs ? (theirs.answers[i] === mine.answers[i] ? "same" : "diff") : ""}>
              <span className="tot-pick">
                <Avatar avatarKey={me.avatar_key} size={16} /> {pair[mine.answers[i]] ?? "—"}
              </span>
              {theirs && (
                <span className="tot-pick">
                  <Avatar avatarKey={partner.avatar_key} size={16} /> {pair[theirs.answers[i]] ?? "—"}
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="fine center">New picks every day at midnight.</p>
      </div>
    );
  }

  const i = picks.length;
  if (i >= pairs.length) {
    return (
      <div className="quest-game">
        <p className="ttt-status lcd">ALL PICKED!</p>
        {error && <p className="form-error">{error}</p>}
        <button type="button" className="btn btn-coral wide" disabled={busy} onClick={() => run(() => onSubmit(picks))}>
          {busy ? "SENDING…" : "▶ LOCK IN MY PICKS"}
        </button>
        <button type="button" className="link-btn" onClick={() => setPicks([])}>
          START AGAIN
        </button>
      </div>
    );
  }

  const [a, b] = pairs[i];
  return (
    <div className="quest-game">
      <p className="lcd small center">
        {i + 1} / {pairs.length} · WHICH ONE?{partnerDone ? ` · ${partner.display_name} HAS PICKED` : ""}
      </p>
      <div className="tot-choice">
        <button type="button" className="tot-card left" onClick={() => setPicks((p) => [...p, 0])}>
          {a}
        </button>
        <span className="tot-or">OR</span>
        <button type="button" className="tot-card right" onClick={() => setPicks((p) => [...p, 1])}>
          {b}
        </button>
      </div>
      {i > 0 && (
        <button type="button" className="link-btn" onClick={() => setPicks((p) => p.slice(0, -1))}>
          ← BACK
        </button>
      )}
    </div>
  );
}
