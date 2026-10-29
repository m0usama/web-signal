"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FRAMES, PALETTES, PIXEL_SIZES, ASPECT, renderSpideyCam, type FrameKey, type Source } from "@/lib/spideycam";
import { synth } from "@/lib/sound";
import type { SignalMode } from "@/lib/types";

/** Output size of a sent snap (3:4). Small PNG thanks to the flat colours. */
const OUT_W = 540;
const OUT_H = Math.round(OUT_W * ASPECT);

type SendMode = Extract<SignalMode, "ghost" | "day" | "normal">;
const SEND_MODES: { key: SendMode; label: string; hint: string }[] = [
  { key: "ghost", label: "👻 SNAP", hint: "Opens once for 10 seconds, then gone" },
  { key: "day", label: "◐ 24H", hint: "Stays in the chat for 24 hours" },
  { key: "normal", label: "● KEEP", hint: "Stays in the chat" },
];

function stampNow() {
  const d = new Date();
  return `${d.toLocaleDateString([], { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

/**
 * Retro live camera. Everything is filtered on the phone; only the red/blue
 * pixel version is ever uploaded.
 */
export function SpideyCam({
  partnerName,
  onClose,
  onSend,
}: {
  partnerName: string;
  onClose: () => void;
  onSend: (file: File, mode: SendMode) => Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const outRef = useRef<HTMLCanvasElement>(null);
  const workRef = useRef<HTMLCanvasElement | null>(null);
  const stillRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [camState, setCamState] = useState<"starting" | "live" | "error">("starting");
  const [camError, setCamError] = useState("");
  const [captured, setCaptured] = useState(false);
  const [mirrorStill, setMirrorStill] = useState(false);
  const [paletteIx, setPaletteIx] = useState(0);
  const [sizeIx, setSizeIx] = useState(1);
  const [frameIx, setFrameIx] = useState(0);
  const [mode, setMode] = useState<SendMode>("ghost");
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState(false);
  const [stamp, setStamp] = useState(stampNow);

  const [camGen, setCamGen] = useState(0);
  const opts = useRef({ palette: PALETTES[0], cols: PIXEL_SIZES[1].cols as number, frame: FRAMES[0].key as FrameKey });
  useEffect(() => {
    opts.current = { palette: PALETTES[paletteIx], cols: PIXEL_SIZES[sizeIx].cols, frame: FRAMES[frameIx].key };
  }, [paletteIx, sizeIx, frameIx]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Camera on/off (restarts when flipping, pauses while a snap is on screen).
  useEffect(() => {
    if (captured) return;
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamState("error");
        setCamError("THIS BROWSER CAN'T OPEN THE CAMERA");
        return;
      }
      setCamState("starting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 960 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        stopStream();
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => {});
        }
        setCamState("live");
      } catch (e) {
        if (cancelled) return;
        setCamState("error");
        const name = (e as { name?: string }).name;
        setCamError(
          name === "NotAllowedError"
            ? "CAMERA BLOCKED — ALLOW IT IN SETTINGS, OR PICK A PHOTO"
            : name === "NotFoundError"
              ? "NO CAMERA FOUND — PICK A PHOTO INSTEAD"
              : "COULDN'T START THE CAMERA",
        );
      }
    })();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [facing, captured, camGen, stopStream]);

  // Live preview at ~15 fps (retro, and easy on the battery).
  useEffect(() => {
    if (captured || camState !== "live") return;
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 66) return;
      last = t;
      const v = videoRef.current;
      const out = outRef.current;
      if (!v || !out || v.readyState < 2) return;
      workRef.current ??= document.createElement("canvas");
      renderSpideyCam(v, out, workRef.current, { ...opts.current, mirror: facing === "user" });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [captured, camState, facing]);

  // A captured snap re-renders when you change the frame / colours / pixel size.
  const renderStill = useCallback(() => {
    const still = stillRef.current;
    const out = outRef.current;
    if (!still || !out) return;
    workRef.current ??= document.createElement("canvas");
    renderSpideyCam(still as Source, out, workRef.current, { ...opts.current, mirror: mirrorStill, stamp });
  }, [mirrorStill, stamp]);

  useEffect(() => {
    if (captured) renderStill();
  }, [captured, paletteIx, sizeIx, frameIx, renderStill]);

  // Stop the camera if the app goes to the background.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") stopStream();
      else if (!captured) setCamGen((g) => g + 1); // restart the camera
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [captured, stopStream]);

  const keepStill = (source: CanvasImageSource, w: number, h: number, mirror: boolean) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(source, 0, 0, w, h);
    stillRef.current = c;
    setMirrorStill(mirror);
    setStamp(stampNow());
    setCaptured(true);
  };

  const shoot = () => {
    const v = videoRef.current;
    if (!v || camState !== "live" || !v.videoWidth) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    void synth.unlock().then(() => synth.play("send", true));
    keepStill(v, v.videoWidth, v.videoHeight, facing === "user");
    stopStream();
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      keepStill(img, Math.round(img.naturalWidth * scale), Math.round(img.naturalHeight * scale), false);
      stopStream();
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const retake = () => {
    stillRef.current = null;
    setCaptured(false);
  };

  const send = async () => {
    const out = outRef.current;
    if (!out) return;
    setSending(true);
    try {
      renderStill();
      const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/png"));
      if (!blob) throw new Error("COULDN'T SAVE THE SNAP");
      await onSend(new File([blob], "spidey-cam.png", { type: "image/png" }), mode);
      onClose();
    } catch {
      setSending(false);
    }
  };

  const cycle = (set: (f: (i: number) => number) => void, n: number) => set((i) => (i + 1) % n);

  // Rendered at the top of the page so the chat panel can't clip it.
  return createPortal(
    <div className="cam" role="dialog" aria-modal="true" aria-label="Spidey-Cam">
      <div className="cam-top">
        <span className="lcd">
          {captured ? "SNAP READY" : <><span className="cam-rec" aria-hidden /> SPIDEY-CAM</>}
        </span>
        <span className="lcd small">TO {partnerName}</span>
        <button type="button" className="btn btn-sq btn-ghost" onClick={onClose} aria-label="Close camera">
          ✕
        </button>
      </div>

      <div className="cam-stage">
        <canvas ref={outRef} width={OUT_W} height={OUT_H} className="cam-canvas" aria-label="Spidey-Cam preview" />
        {!captured && camState === "starting" && <p className="cam-msg lcd lcd-blink">WARMING UP THE WEB-CAM…</p>}
        {!captured && camState === "error" && (
          <div className="cam-msg">
            <p className="lcd">{camError}</p>
            <button type="button" className="btn btn-orange" onClick={() => fileRef.current?.click()}>
              🖼 PICK A PHOTO
            </button>
          </div>
        )}
        {flash && <div className="cam-flash" aria-hidden />}
        <video ref={videoRef} className="cam-video" playsInline muted autoPlay aria-hidden />
      </div>

      <div className="cam-tweaks">
        <button type="button" className="chip-btn" onClick={() => cycle(setFrameIx, FRAMES.length)} aria-label="Change frame">
          ▣ {FRAMES[frameIx].label}
        </button>
        <button type="button" className="chip-btn" onClick={() => cycle(setPaletteIx, PALETTES.length)} aria-label="Change colours">
          ◑ {PALETTES[paletteIx].label}
        </button>
        <button type="button" className="chip-btn" onClick={() => cycle(setSizeIx, PIXEL_SIZES.length)} aria-label="Change pixel size">
          ▦ {PIXEL_SIZES[sizeIx].label}
        </button>
      </div>

      {!captured ? (
        <div className="cam-controls">
          <button type="button" className="btn btn-sq btn-violet" onClick={() => fileRef.current?.click()} aria-label="Pick a photo">
            🖼
          </button>
          <button type="button" className="cam-shutter" onClick={shoot} disabled={camState !== "live"} aria-label="Take snap">
            <span />
          </button>
          <button
            type="button"
            className="btn btn-sq btn-violet"
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            disabled={camState === "error"}
            aria-label="Flip camera"
          >
            ⟲
          </button>
        </div>
      ) : (
        <div className="cam-send">
          <div className="seg" role="radiogroup" aria-label="How long it lasts">
            {SEND_MODES.map((m) => (
              <button key={m.key} type="button" className={mode === m.key ? "on" : ""} onClick={() => setMode(m.key)} aria-pressed={mode === m.key}>
                {m.label}
              </button>
            ))}
          </div>
          <p className="fine">{SEND_MODES.find((m) => m.key === mode)?.hint}</p>
          <div className="row-between gap">
            <button type="button" className="btn btn-ghost" onClick={retake} disabled={sending}>
              ↺ RETAKE
            </button>
            <button type="button" className="btn btn-coral" onClick={send} disabled={sending}>
              {sending ? "SENDING…" : "SEND SNAP ▸"}
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
        hidden
        onChange={(e) => {
          void pickPhoto(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>,
    document.body,
  );
}
