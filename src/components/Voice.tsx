"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration, MAX_VOICE_MS, MIN_VOICE_MS, VoiceRecorder, type Recording } from "@/lib/voice";
import { keyUpSound, playRadio, primeRadio, type RadioHandle } from "@/lib/radio";
import type { Message } from "@/lib/types";

/** Hold to talk, release to send, slide away to cancel. */
export function TalkButton({ onRecorded, onProblem }: { onRecorded: (r: Recording) => void; onProblem: (msg: string) => void }) {
  const [state, setState] = useState<"idle" | "starting" | "rec">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [cancelArmed, setCancelArmed] = useState(false);
  const rec = useRef<VoiceRecorder | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const released = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      rec.current?.cancel();
    },
    [],
  );

  const finish = async (send: boolean) => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    const r = rec.current;
    rec.current = null;
    setState("idle");
    setCancelArmed(false);
    if (!r) return;
    if (!send) {
      r.cancel();
      return;
    }
    const result = await r.stop();
    if (!result) return;
    if (result.durationMs < MIN_VOICE_MS) {
      onProblem("HOLD THE BUTTON WHILE YOU TALK");
      return;
    }
    onRecorded(result);
  };

  const down = async (e: React.PointerEvent<HTMLButtonElement>) => {
    if (state !== "idle") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    released.current = false;
    if (!VoiceRecorder.supported()) {
      onProblem("THIS BROWSER CAN'T RECORD AUDIO");
      return;
    }
    setState("starting");
    keyUpSound();
    primeRadio();
    const r = new VoiceRecorder();
    try {
      await r.start();
    } catch {
      setState("idle");
      onProblem("MICROPHONE BLOCKED — ALLOW IT IN YOUR BROWSER SETTINGS");
      return;
    }
    rec.current = r;
    if (released.current) {
      // Let go before the mic was ready: treat as a tap.
      void finish(false);
      onProblem("HOLD THE BUTTON WHILE YOU TALK");
      return;
    }
    setState("rec");
    setElapsed(0);
    timer.current = setInterval(() => {
      const ms = r.elapsed();
      setElapsed(ms);
      if (ms >= MAX_VOICE_MS) void finish(true);
    }, 100);
  };

  const move = (e: React.PointerEvent) => {
    if (state !== "rec") return;
    setCancelArmed(Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 70);
  };

  const up = () => {
    released.current = true;
    if (state === "rec") void finish(!cancelArmed);
  };

  return (
    <>
      {state === "rec" && (
        <div className={`rec-overlay ${cancelArmed ? "cancel" : ""}`} role="status" aria-live="polite">
          <span className="rec-led" aria-hidden />
          <span className="rec-time">{formatDuration(elapsed)}</span>
          <span className="rec-bar" aria-hidden>
            <i style={{ width: `${Math.min(100, (elapsed / MAX_VOICE_MS) * 100)}%` }} />
          </span>
          <span className="rec-hint">{cancelArmed ? "LET GO TO CANCEL" : "RELEASE TO SEND · SLIDE AWAY TO CANCEL"}</span>
        </div>
      )}
      <button
        type="button"
        className={`btn btn-coral talk-btn state-${state} ${cancelArmed ? "cancel" : ""}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => {
          released.current = true;
          void finish(false);
        }}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Hold to record a voice note"
      >
        📻 {state === "rec" ? "TALKING" : "TALK"}
      </button>
    </>
  );
}

/** A received/sent voice note, played back through the radio effect. */
export function VoiceNote({ m, url, exp, onNeed }: { m: Message; url?: string; exp?: number; onNeed: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const handle = useRef<RadioHandle | null>(null);
  const needRef = useRef(onNeed);
  useEffect(() => {
    needRef.current = onNeed;
  });

  // Fetch a fresh link when the note scrolls into view (links are short-lived).
  useEffect(() => {
    const expired = exp !== undefined && exp < Date.now();
    if ((url && !expired) || m._status) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        needRef.current();
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [url, exp, m._status]);

  useEffect(() => () => handle.current?.stop(), []);

  const toggle = () => {
    if (playing) {
      handle.current?.stop();
      return;
    }
    if (!url || (exp !== undefined && exp < Date.now())) {
      needRef.current();
      return;
    }
    setFailed(false);
    setPlaying(true);
    setProgress(0);
    handle.current = playRadio(url, {
      onProgress: setProgress,
      onEnd: () => {
        setPlaying(false);
        setProgress(0);
        handle.current = null;
      },
      onError: () => {
        setPlaying(false);
        setFailed(true);
        handle.current = null;
        needRef.current();
      },
    });
  };

  const bars = 18;
  return (
    <div ref={ref} className={`voice-note ${playing ? "playing" : ""}`}>
      <button type="button" className="voice-play" onClick={toggle} disabled={!!m._status} aria-label={playing ? "Stop voice note" : "Play voice note"}>
        {playing ? "■" : "▶"}
      </button>
      <span className="voice-wave" aria-hidden>
        {Array.from({ length: bars }, (_, i) => (
          <i
            key={i}
            className={i / bars < progress ? "on" : ""}
            style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i % 6) * 0.08}s` }}
          />
        ))}
      </span>
      <span className="voice-meta">
        <strong>📻 {formatDuration(m.duration_ms ?? 0)}</strong>
        <span>{m._status === "sending" ? "TRANSMITTING…" : failed ? "STATIC… TAP AGAIN" : "VOICE SIGNAL"}</span>
      </span>
    </div>
  );
}

/** Auto-playing radio for a ghost voice note inside the reveal screen. */
export function GhostVoicePlayer({ url, onDone }: { url: string; onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });
  useEffect(() => {
    const h = playRadio(url, {
      onProgress: setProgress,
      onEnd: () => doneRef.current(),
      onError: () => doneRef.current(),
    });
    return () => h.stop();
  }, [url]);
  return (
    <div className="voice-note playing ghost-voice">
      <span className="voice-play" aria-hidden>
        📻
      </span>
      <span className="voice-wave" aria-hidden>
        {Array.from({ length: 22 }, (_, i) => (
          <i key={i} className={i / 22 < progress ? "on" : ""} style={{ height: `${30 + ((i * 37) % 70)}%` }} />
        ))}
      </span>
      <span className="voice-meta">
        <strong>INCOMING</strong>
        <span>PLAYS ONCE</span>
      </span>
    </div>
  );
}
