"use client";

import { useEffect, useState } from "react";
import { LOGO } from "@/lib/pixels";
import { PixelArt } from "./PixelArt";

const LINE = "ESTABLISHING SECURE SIGNAL…";

/** Boot sequence. Plays once per browser session; always skippable. */
export function Intro({ onDone, reduced }: { onDone: () => void; reduced: boolean }) {
  const [typed, setTyped] = useState(reduced ? LINE.length : 0);
  const [stage, setStage] = useState<"boot" | "locked" | "out">(reduced ? "locked" : "boot");

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(onDone, 900);
      return () => clearTimeout(t);
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= LINE.length; i++) timers.push(setTimeout(() => setTyped(i), 500 + i * 45));
    const typedAt = 500 + LINE.length * 45;
    timers.push(setTimeout(() => setStage("locked"), typedAt + 450));
    timers.push(setTimeout(() => setStage("out"), typedAt + 1500));
    timers.push(setTimeout(onDone, typedAt + 1900));
    return () => timers.forEach(clearTimeout);
  }, [onDone, reduced]);

  return (
    <div className={`intro stage-${stage}`} role="dialog" aria-label="Starting WEB//SIGNAL">
      <div className="intro-inner">
        <div className="intro-logo">
          <PixelArt sprite={LOGO} size={112} />
        </div>
        <p className="intro-title">WEB//SIGNAL</p>
        <p className="intro-line lcd" aria-live="polite">
          {LINE.slice(0, typed)}
          <span className="caret">█</span>
        </p>
        {stage !== "boot" && <p className="intro-locked">SIGNAL LOCKED · YOUR CITY IS ONLINE</p>}
      </div>
      <button type="button" className="intro-skip btn btn-ghost" onClick={onDone}>
        SKIP ▸
      </button>
    </div>
  );
}
