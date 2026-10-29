"use client";

import { useState } from "react";
import { countdownText, MOODS, sparkDay, sparkQuestion } from "@/lib/spark";
import type { Countdown, Mood, Profile, SparkAnswer } from "@/lib/types";

/** Today's question. Your partner's answer unlocks once you've answered (enforced by the database). */
export function SparkCard({
  me,
  partner,
  answers,
  streak,
  onAnswer,
}: {
  me: Profile;
  partner: Profile;
  answers: SparkAnswer[];
  streak: number;
  onAnswer: (text: string) => Promise<void>;
}) {
  const today = sparkDay();
  const mine = answers.find((a) => a.day === today && a.user_id === me.id);
  const theirs = answers.find((a) => a.day === today && a.user_id === partner.id);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="spark-card">
      <div className="spark-head">
        <span className="lcd">✨ DAILY SPARK</span>
        <span className={`streak ${streak > 0 ? "on" : ""}`} title="Days in a row you both answered">
          🔥 {streak}
        </span>
      </div>
      <p className="spark-q">{sparkQuestion(today)}</p>
      {!mine ? (
        <form
          className="spark-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim()) return;
            setBusy(true);
            setError("");
            try {
              await onAnswer(text);
              setText("");
            } catch {
              setError("COULDN'T SAVE — TRY AGAIN");
            } finally {
              setBusy(false);
            }
          }}
        >
          <textarea
            className="composer-input"
            rows={2}
            maxLength={500}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`ANSWER TO UNLOCK ${partner.display_name}'S…`}
            aria-label="Your answer"
          />
          <button type="submit" className="btn btn-orange" disabled={!text.trim() || busy}>
            {busy ? "…" : "LOCK IN"}
          </button>
          {error && <p className="form-error">{error}</p>}
        </form>
      ) : (
        <div className="spark-answers">
          <div className="spark-a me">
            <span>YOU</span>
            <p>{mine.answer}</p>
          </div>
          <div className={`spark-a them ${theirs ? "" : "waiting"}`}>
            <span>{partner.display_name}</span>
            <p>{theirs ? theirs.answer : "WAITING FOR THEIR ANSWER…"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function MoodPicker({ current, onPick }: { current: Mood | null | undefined; onPick: (m: Mood | null) => void }) {
  return (
    <div className="mood-grid" role="radiogroup" aria-label="Your status">
      {MOODS.map((m) => (
        <button
          key={m.key}
          type="button"
          className={`mood-btn ${current === m.key ? "on" : ""}`}
          onClick={() => onPick(current === m.key ? null : (m.key as Mood))}
          aria-pressed={current === m.key}
        >
          <span className="mood-emoji">{m.emoji}</span>
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CountdownEditor({ value, onSave }: { value: Countdown; onSave: (at: string | null, label: string | null) => Promise<void> }) {
  const [when, setWhen] = useState(toLocalInput(value.at));
  const [label, setLabel] = useState(value.label ?? "");
  const [msg, setMsg] = useState("");
  const left = countdownText(value.at);

  return (
    <div className="countdown-card">
      <div className="countdown-now lcd">
        {left ? (
          <>
            ♥ {value.label ? `${value.label.toUpperCase()} IN` : "NEXT MEET IN"} <strong>{left}</strong>
          </>
        ) : (
          "♥ NO MEET-UP SET"
        )}
      </div>
      <input className="field" value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} placeholder="WHAT? (E.G. PICNIC)" aria-label="What" />
      <input className="field" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="When" />
      <div className="row-between gap">
        <button
          type="button"
          className="btn btn-green grow"
          disabled={!when}
          onClick={async () => {
            setMsg("");
            try {
              await onSave(new Date(when).toISOString(), label.trim() || null);
              setMsg("COUNTDOWN SET");
            } catch {
              setMsg("PICK A TIME IN THE FUTURE");
            }
          }}
        >
          SET COUNTDOWN
        </button>
        {value.at && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => {
              await onSave(null, null);
              setWhen("");
              setLabel("");
            }}
          >
            CLEAR
          </button>
        )}
      </div>
      {msg && <p className="fine">{msg}</p>}
    </div>
  );
}
