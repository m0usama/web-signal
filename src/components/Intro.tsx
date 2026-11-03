"use client";

import { useEffect, useState } from "react";
import type { SpiderLook } from "@/lib/spider";
import { SpiderSprite } from "./SpiderSprite";

const LINE = "ESTABLISHING SECURE SIGNAL…";

/**
 * Start screen: your spider drops down on its thread under the sign, says hi,
 * and the signal locks in. Plays once per app launch; always skippable.
 */
export function Intro({ onDone, reduced, look, name }: { onDone: () => void; reduced: boolean; look: SpiderLook; name: string }) {
  const [typed, setTyped] = useState(reduced ? LINE.length : 0);
  const [stage, setStage] = useState<"drop" | "hello" | "locked" | "out">(reduced ? "locked" : "drop");

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(onDone, 1100);
      return () => clearTimeout(t);
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage("hello"), 1300));
    for (let i = 1; i <= LINE.length; i++) timers.push(setTimeout(() => setTyped(i), 1400 + i * 40));
    const typedAt = 1400 + LINE.length * 40;
    timers.push(setTimeout(() => setStage("locked"), typedAt + 300));
    timers.push(setTimeout(() => setStage("out"), typedAt + 1300));
    timers.push(setTimeout(onDone, typedAt + 1700));
    return () => timers.forEach(clearTimeout);
  }, [onDone, reduced]);

  return (
    <div className={`intro intro-spider stage-${stage}`} role="dialog" aria-label="Starting WEB//SIGNAL">
      <svg className="intro-web" viewBox="-50 -50 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} x1={0} y1={0} x2={Math.cos(a) * 80} y2={Math.sin(a) * 80} />;
        })}
        {[8, 16, 25, 35, 46, 58].map((r) => (
          <polygon
            key={r}
            points={Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return `${Math.cos(a) * r},${Math.sin(a) * r}`;
            }).join(" ")}
          />
        ))}
      </svg>

      <div className="intro-sign">
        <span className="intro-sign-text">WEB//SIGNAL</span>
      </div>
      <p className="intro-sub lcd">PRIVATE FREQUENCY · TWO HEROES ONLY</p>

      <div className="intro-thread-wrap">
        <div className="intro-dangle">
          <span className="intro-thread" aria-hidden />
          <SpiderSprite look={look} size={132} />
          {stage !== "drop" && <span className="intro-hello">HEY {name}!</span>}
        </div>
      </div>

      <div className="intro-bottom">
        <p className="intro-line lcd" aria-live="polite">
          {LINE.slice(0, typed)}
          <span className="caret">█</span>
        </p>
        {(stage === "locked" || stage === "out") && <p className="intro-locked">SIGNAL LOCKED · YOUR CITY IS ONLINE</p>}
      </div>

      <button type="button" className="intro-skip btn btn-ghost" onClick={onDone}>
        SKIP ▸
      </button>
    </div>
  );
}
