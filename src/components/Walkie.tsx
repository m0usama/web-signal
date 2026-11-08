"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/types";
import type { PartnerPresence, WalkieSignal } from "@/lib/useRoom";
import { Avatar } from "./Avatar";

type Phase = "starting" | "waiting" | "connecting" | "live" | "failed" | "nomic";
type MicMode = "ptt" | "open";

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }],
};

/**
 * Walkie-talkie: a live two-person voice room inside a chat.
 * Audio goes straight between the two phones (WebRTC); the private room
 * channel only carries the handshake. Nothing is recorded or stored.
 */
export function Walkie({
  me,
  partner,
  presence,
  minimized,
  send,
  setOn,
  register,
  onMinimize,
  onExpand,
  onLeave,
}: {
  me: Profile;
  partner: Profile;
  presence: PartnerPresence;
  minimized: boolean;
  send: (s: WalkieSignal) => boolean;
  setOn: (on: boolean) => void;
  register: (fn: ((s: WalkieSignal) => void) | null) => void;
  onMinimize: () => void;
  onExpand: () => void;
  onLeave: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("starting");
  const [mode, setMode] = useState<MicMode>("ptt");
  const [muted, setMuted] = useState(false);
  const [holding, setHolding] = useState(false);
  const [meLevel, setMeLevel] = useState(0);
  const [themLevel, setThemLevel] = useState(0);
  const [since, setSince] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const audioEl = useRef<HTMLAudioElement>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const ctx = useRef<AudioContext | null>(null);
  const meAn = useRef<AnalyserNode | null>(null);
  const themAn = useRef<AnalyserNode | null>(null);
  const joined = useRef(false);
  const startRef = useRef<() => Promise<void>>(async () => {});
  const retried = useRef(0);
  const initiator = me.id < partner.id;
  const stateRef = useRef({ mode, muted, holding });
  useEffect(() => {
    stateRef.current = { mode, muted, holding };
    const on = !muted && (mode === "open" || holding);
    local.current?.getAudioTracks().forEach((t) => (t.enabled = on));
  }, [mode, muted, holding]);

  const closePeer = useCallback(() => {
    pendingIce.current = [];
    themAn.current = null;
    if (pc.current) {
      pc.current.onicecandidate = null;
      pc.current.ontrack = null;
      pc.current.onconnectionstatechange = null;
      pc.current.close();
      pc.current = null;
    }
  }, []);

  const makePeer = useCallback(() => {
    closePeer();
    const peer = new RTCPeerConnection(ICE);
    pc.current = peer;
    local.current?.getTracks().forEach((t) => peer.addTrack(t, local.current!));
    peer.onicecandidate = (e) => {
      if (e.candidate) send({ type: "ice", candidate: e.candidate.toJSON() });
    };
    peer.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      const el = audioEl.current;
      if (el) {
        el.srcObject = stream;
        void el.play().catch(() => {});
      }
      if (ctx.current) {
        const an = ctx.current.createAnalyser();
        an.fftSize = 256;
        ctx.current.createMediaStreamSource(stream).connect(an);
        themAn.current = an;
      }
    };
    peer.onconnectionstatechange = () => {
      const st = peer.connectionState;
      if (st === "connected") {
        retried.current = 0;
        setPhase("live");
        setSince((s) => s ?? Date.now());
        navigator.vibrate?.(30);
      } else if (st === "failed") {
        setPhase("failed");
        if (initiator && retried.current < 2 && joined.current) {
          retried.current += 1;
          setTimeout(() => void startRef.current(), 800);
        }
      } else if (st === "disconnected") {
        setPhase("connecting");
      }
    };
    return peer;
  }, [closePeer, send, initiator]);

  const flushIce = useCallback(async () => {
    const peer = pc.current;
    if (!peer?.remoteDescription) return;
    for (const c of pendingIce.current.splice(0)) await peer.addIceCandidate(c).catch(() => {});
  }, []);

  const startOffer = useCallback(async () => {
    if (!joined.current) return;
    const peer = makePeer();
    setPhase("connecting");
    const offer = await peer.createOffer({ offerToReceiveAudio: true });
    await peer.setLocalDescription(offer);
    send({ type: "offer", sdp: offer.sdp });
  }, [makePeer, send]);
  useEffect(() => {
    startRef.current = startOffer;
  }, [startOffer]);

  // Signals from the partner.
  useEffect(() => {
    register(async (sig) => {
      if (!joined.current) return;
      try {
        if (sig.type === "hello") {
          if (initiator) await startOffer();
          else send({ type: "hello-ack" });
        } else if (sig.type === "hello-ack") {
          if (initiator) await startOffer();
        } else if (sig.type === "offer" && sig.sdp) {
          const peer = makePeer();
          setPhase("connecting");
          await peer.setRemoteDescription({ type: "offer", sdp: sig.sdp });
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          send({ type: "answer", sdp: answer.sdp });
          await flushIce();
        } else if (sig.type === "answer" && sig.sdp && pc.current) {
          await pc.current.setRemoteDescription({ type: "answer", sdp: sig.sdp });
          await flushIce();
        } else if (sig.type === "ice" && sig.candidate) {
          if (pc.current?.remoteDescription) await pc.current.addIceCandidate(sig.candidate).catch(() => {});
          else pendingIce.current.push(sig.candidate);
        } else if (sig.type === "bye") {
          closePeer();
          setPhase("waiting");
          setSince(null);
        }
      } catch {
        setPhase("failed");
      }
    });
    return () => register(null);
  }, [register, initiator, startOffer, makePeer, send, flushIce, closePeer]);

  // Join on open: microphone, then say hello.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        local.current = stream;
        stream.getAudioTracks().forEach((t) => (t.enabled = false));
        try {
          const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          ctx.current = new AC();
          const an = ctx.current.createAnalyser();
          an.fftSize = 256;
          ctx.current.createMediaStreamSource(stream).connect(an);
          meAn.current = an;
        } catch {
          // levels are only decoration
        }
        joined.current = true;
        setOn(true);
        setPhase("waiting");
        send({ type: "hello" });
      } catch {
        if (!cancelled) setPhase("nomic");
      }
    })();
    return () => {
      cancelled = true;
      if (joined.current) send({ type: "bye" });
      joined.current = false;
      setOn(false);
      closePeer();
      local.current?.getTracks().forEach((t) => t.stop());
      local.current = null;
      void ctx.current?.close().catch(() => {});
      ctx.current = null;
    };
  }, [send, setOn, closePeer]);

  // If the partner arrives after us (or comes back), the initiator calls.
  useEffect(() => {
    if (!presence.walkie || !joined.current) return;
    if (phase === "waiting" || phase === "failed") {
      const t = setTimeout(() => {
        if (initiator) void startOffer();
        else send({ type: "hello" });
      }, 300);
      return () => clearTimeout(t);
    }
  }, [presence.walkie, phase, initiator, startOffer, send]);

  // Talking lights.
  useEffect(() => {
    let raf = 0;
    const buf = new Uint8Array(128);
    const level = (an: AnalyserNode | null) => {
      if (!an) return 0;
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += (v - 128) * (v - 128);
      return Math.min(1, Math.sqrt(sum / buf.length) / 30);
    };
    let last = 0;
    const tick = (t: number) => {
      if (t - last > 90) {
        last = t;
        const s = stateRef.current;
        setMeLevel(!s.muted && (s.mode === "open" || s.holding) ? level(meAn.current) : 0);
        setThemLevel(level(themAn.current));
        setNow(Date.now());
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const talking = !muted && (mode === "open" || holding);
  const theyTalk = phase === "live" && themLevel > 0.08;
  const status =
    phase === "starting"
      ? "TUNING IN…"
      : phase === "nomic"
        ? "MIC BLOCKED — ALLOW THE MICROPHONE"
        : phase === "waiting"
          ? presence.walkie
            ? "CONNECTING…"
            : `WAITING FOR ${partner.display_name}…`
          : phase === "connecting"
            ? "CONNECTING…"
            : phase === "failed"
              ? "LINK DROPPED — RETRYING"
              : theyTalk
                ? `${partner.display_name} IS TALKING`
                : "CHANNEL OPEN";
  const clock = since ? fmt(now - since) : "--:--";

  const press = (on: boolean) => {
    if (mode !== "ptt") return;
    setHolding(on);
    if (on) navigator.vibrate?.(12);
  };

  if (minimized) {
    return (
      <>
        <audio ref={audioEl} autoPlay playsInline />
        <button type="button" className={`walkie-pill ${phase === "live" ? "live" : ""} ${theyTalk ? "rx" : ""}`} onClick={onExpand}>
          <span aria-hidden>📻</span> {phase === "live" ? `LIVE ${clock}` : "WALKIE"} {talking ? "· ON AIR" : ""}
        </button>
      </>
    );
  }

  return (
    <div className="walkie" role="dialog" aria-label="Walkie-talkie">
      <audio ref={audioEl} autoPlay playsInline />
      <div className="walkie-top">
        <button type="button" className="btn btn-ghost" onClick={onMinimize} aria-label="Minimise">
          ▾ HIDE
        </button>
        <span className="walkie-title">📻 WALKIE · {clock}</span>
        <span className={`walkie-dot ${phase === "live" ? "on" : ""}`} aria-hidden />
      </div>

      <div className="walkie-people">
        <div className={`walkie-person ${theyTalk ? "talking" : ""} ${presence.walkie ? "" : "away"}`} style={{ ["--lvl" as string]: themLevel }}>
          <span className="walkie-ring" aria-hidden />
          <Avatar avatarKey={partner.avatar_key} size={84} label={partner.display_name} />
          <strong>{partner.display_name}</strong>
          <small>{presence.walkie ? (theyTalk ? "TALKING" : "IN THE ROOM") : "NOT HERE YET"}</small>
        </div>
        <div className={`walkie-person ${talking && meLevel > 0.08 ? "talking" : ""}`} style={{ ["--lvl" as string]: meLevel }}>
          <span className="walkie-ring" aria-hidden />
          <Avatar avatarKey={me.avatar_key} size={84} label={me.display_name} />
          <strong>YOU</strong>
          <small>{muted ? "MUTED" : talking ? "ON AIR" : mode === "ptt" ? "HOLD TO TALK" : "MIC OFF"}</small>
        </div>
      </div>

      <p className="walkie-status lcd" aria-live="polite">
        {status}
      </p>

      <div className="seg walkie-modes" role="radiogroup" aria-label="Microphone mode">
        <button type="button" role="radio" aria-checked={mode === "ptt"} className={mode === "ptt" ? "on" : ""} onClick={() => setMode("ptt")}>
          PUSH TO TALK
        </button>
        <button type="button" role="radio" aria-checked={mode === "open"} className={mode === "open" ? "on" : ""} onClick={() => setMode("open")}>
          KEEP TALKING
        </button>
      </div>

      <button
        type="button"
        className={`walkie-ptt ${talking ? "on" : ""} ${mode === "open" ? "open" : ""}`}
        disabled={phase === "nomic" || muted}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          press(true);
        }}
        onPointerUp={() => press(false)}
        onPointerCancel={() => press(false)}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => e.key === " " && !e.repeat && press(true)}
        onKeyUp={(e) => e.key === " " && press(false)}
        style={{ ["--lvl" as string]: meLevel }}
      >
        <span className="walkie-ptt-grill" aria-hidden />
        <span>{muted ? "MUTED" : mode === "open" ? (talking ? "ON AIR" : "…") : holding ? "TALKING…" : "HOLD TO TALK"}</span>
      </button>

      <div className="walkie-actions">
        <button type="button" className={`btn ${muted ? "btn-coral" : "btn-ghost"}`} onClick={() => setMuted((m) => !m)} aria-pressed={muted}>
          {muted ? "🔇 UNMUTE" : "🎙 MUTE"}
        </button>
        <button type="button" className="btn btn-coral" onClick={onLeave}>
          ✕ LEAVE
        </button>
      </div>
      <p className="fine walkie-note">Live voice goes straight between your two phones. Nothing is recorded.</p>
    </div>
  );
}

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
