"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Landmark } from "@/lib/landmarks";
import type { HeroScore, Profile } from "@/lib/types";
import { Avatar } from "../Avatar";

/** Bottom sheet that every landmark opens into (full height on phones). */
export function QuestSheet({
  lm,
  onClose,
  scores,
  me,
  partner,
  children,
}: {
  lm: Landmark;
  onClose: () => void;
  scores: HeroScore[];
  me: Profile;
  partner: Profile;
  children: ReactNode;
}) {
  // Close on Escape (keyboards / desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="quest-sheet" role="dialog" aria-modal="true" aria-label={lm.name} style={{ "--lm": lm.color } as React.CSSProperties}>
      <div className="quest-head">
        <span className="quest-sign" aria-hidden>
          {lm.emoji}
        </span>
        <div className="grow">
          <p className="quest-name">{lm.name}</p>
          <p className="quest-activity lcd">{lm.activity}</p>
        </div>
        <button type="button" className="btn btn-sq btn-ghost" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <HeroBar scores={scores} me={me} partner={partner} />
      <div className="quest-body">{children}</div>
    </div>
  );
}

/** This week's hero points, side by side. */
export function HeroBar({ scores, me, partner }: { scores: HeroScore[]; me: Profile; partner: Profile }) {
  const mine = scores.find((s) => s.user_id === me.id)?.points ?? 0;
  const theirs = scores.find((s) => s.user_id === partner.id)?.points ?? 0;
  const total = Math.max(1, mine + theirs);
  return (
    <div className="hero-bar" aria-label={`Hero points this week: you ${mine}, ${partner.display_name} ${theirs}`}>
      <span className="hero-side">
        <Avatar avatarKey={me.avatar_key} size={20} />
        <b>{mine}</b>
      </span>
      <span className="hero-meter" aria-hidden>
        <i style={{ width: `${(mine / total) * 100}%` }} />
      </span>
      <span className="hero-side">
        <b>{theirs}</b>
        <Avatar avatarKey={partner.avatar_key} size={20} />
      </span>
      <span className="hero-label lcd">HERO PTS · THIS WEEK</span>
    </div>
  );
}

/** Runs an async action with a busy flag and a friendly error. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      return true;
    } catch (e) {
      setError(friendly(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run, setError };
}

export function friendly(e: unknown): string {
  const m = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e ?? "");
  if (m.includes("NOT_YOUR_TURN")) return "NOT YOUR TURN YET";
  if (m.includes("BAD_MOVE")) return "CAN'T DO THAT ONE";
  if (m.includes("BAD_WORD")) return "LETTERS ONLY, 3–16 OF THEM";
  if (m.includes("GAME_OVER")) return "THAT GAME IS OVER — START A NEW ONE";
  if (m.includes("NO_PARTNER")) return "NOBODY TO PLAY WITH IN THIS CHAT";
  if (m.includes("CHAT_ONLY")) return "THIS CHAT IS FOR MESSAGES ONLY";
  if (m.includes("RATE_LIMIT")) return "SLOW DOWN A SEC";
  if (m.includes("duplicate")) return "ALREADY DONE TODAY";
  return "GLITCH — TRY AGAIN";
}

export function Players({
  me,
  partner,
  meMark,
  theirMark,
  turnIsMine,
  over,
}: {
  me: Profile;
  partner: Profile;
  meMark: ReactNode;
  theirMark: ReactNode;
  turnIsMine: boolean;
  over: boolean;
}) {
  return (
    <div className="ttt-players">
      <span className={!over && turnIsMine ? "on" : ""}>
        <Avatar avatarKey={me.avatar_key} size={22} /> YOU {meMark}
      </span>
      <span className={!over && !turnIsMine ? "on" : ""}>
        {theirMark} {partner.display_name} <Avatar avatarKey={partner.avatar_key} size={22} />
      </span>
    </div>
  );
}
