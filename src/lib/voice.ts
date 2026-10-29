"use client";

/** Push-to-talk recorder. Picks a format every browser can play back (MP4/AAC first). */

export const MAX_VOICE_MS = 55_000;
export const MIN_VOICE_MS = 600;

const CANDIDATES = ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];

export function pickVoiceMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      /* keep looking */
    }
  }
  return "";
}

/** Storage content type without codec parameters. */
export function baseMime(mime: string): string {
  const base = mime.split(";")[0].trim();
  return base || "audio/mp4";
}

export function voiceExtension(mime: string): string {
  const base = baseMime(mime);
  if (base === "audio/webm") return "webm";
  if (base === "audio/ogg") return "ogg";
  if (base === "audio/mpeg") return "mp3";
  return "m4a";
}

/** Ghost voice notes stay viewable long enough to hear them once, plus a few seconds. */
export function ghostSecondsForVoice(durationMs: number): number {
  return Math.min(60, Math.max(5, Math.ceil(durationMs / 1000) + 5));
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export interface Recording {
  blob: Blob;
  mime: string;
  durationMs: number;
}

export class VoiceRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private done: ((r: Recording | null) => void) | null = null;
  private cancelled = false;

  static supported(): boolean {
    return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && pickVoiceMime() !== null;
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const mime = pickVoiceMime() ?? "";
    this.recorder = mime ? new MediaRecorder(this.stream, { mimeType: mime, audioBitsPerSecond: 48_000 }) : new MediaRecorder(this.stream);
    this.chunks = [];
    this.cancelled = false;
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.onstop = () => {
      const durationMs = Date.now() - this.startedAt;
      const type = this.recorder?.mimeType || mime || "audio/mp4";
      this.release();
      const result = this.cancelled || this.chunks.length === 0 ? null : { blob: new Blob(this.chunks, { type: baseMime(type) }), mime: type, durationMs };
      this.done?.(result);
      this.done = null;
    };
    this.startedAt = Date.now();
    this.recorder.start(250);
  }

  elapsed(): number {
    return this.startedAt ? Date.now() - this.startedAt : 0;
  }

  /** Stops and returns the recording (null if cancelled or empty). */
  stop(): Promise<Recording | null> {
    return new Promise((resolve) => {
      if (!this.recorder || this.recorder.state === "inactive") {
        this.release();
        resolve(null);
        return;
      }
      this.done = resolve;
      this.recorder.stop();
    });
  }

  cancel(): void {
    this.cancelled = true;
    if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
    else this.release();
  }

  private release() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
