"use client";

import { useRef, useState } from "react";
import { STICKERS } from "@/lib/pixels";
import { validateFile } from "@/lib/upload";
import { Icon } from "./Icon";

export interface DropDraft {
  body: string;
  sticker: string | null;
  file: File | null;
  mode: "ghost" | "day";
  ghostSeconds: number;
}

export function DropComposer({
  where,
  busy,
  onSubmit,
  onCancel,
}: {
  where: string;
  busy: boolean;
  onSubmit: (d: DropDraft) => void;
  onCancel: () => void;
}) {
  const [body, setBody] = useState("");
  const [sticker, setSticker] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"ghost" | "day">("day");
  const [ghostSeconds, setGhostSeconds] = useState(10);
  const [problem, setProblem] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const ready = body.trim().length > 0 || sticker || file;

  return (
    <div className="sheet drop-sheet" role="dialog" aria-label="New signal drop">
      <div className="sheet-head lcd">
        <span>NEW SIGNAL DROP</span>
        <span>{where}</span>
      </div>
      <textarea
        className="composer-input tall"
        maxLength={280}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="LEAVE A NOTE ON THE ROOF…"
        aria-label="Note"
      />
      <div className="sticker-row" role="radiogroup" aria-label="Sticker">
        {STICKERS.slice(0, 8).map((s) => (
          <button
            key={s}
            type="button"
            className={`drawer-item ${sticker === s ? "on" : ""}`}
            onClick={() => setSticker((cur) => (cur === s ? null : s))}
            aria-pressed={sticker === s}
            aria-label={s}
          >
            <Icon name={s} size={26} />
          </button>
        ))}
      </div>
      <div className="row-between">
        <button type="button" className="btn btn-orange" onClick={() => fileRef.current?.click()}>
          {file ? `✓ ${file.type === "image/gif" ? "GIF" : "PHOTO"} ADDED` : "+ PHOTO / GIF"}
        </button>
        {file && (
          <button type="button" className="link-btn" onClick={() => setFile(null)}>
            REMOVE
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          hidden
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f) {
              const p = validateFile(f);
              setProblem(p ?? "");
              if (!p) setFile(f);
            }
            e.target.value = "";
          }}
        />
      </div>
      <div className="row-between">
        <div className="seg" role="radiogroup" aria-label="Expiry">
          <button type="button" className={mode === "day" ? "on" : ""} onClick={() => setMode("day")} aria-pressed={mode === "day"}>
            ◐ 24H
          </button>
          <button type="button" className={mode === "ghost" ? "on" : ""} onClick={() => setMode("ghost")} aria-pressed={mode === "ghost"}>
            👻 GHOST
          </button>
        </div>
        {mode === "ghost" && (
          <select className="mode-chip" value={ghostSeconds} onChange={(e) => setGhostSeconds(Number(e.target.value))} aria-label="Viewing time">
            {[5, 10, 20, 30].map((s) => (
              <option key={s} value={s}>
                {s}s VIEW
              </option>
            ))}
          </select>
        )}
      </div>
      <p className="fine">
        {mode === "day" ? "Disappears 24 hours after you drop it." : "Disappears after one look (or 24h if never opened)."}
      </p>
      {problem && <p className="form-error">{problem}</p>}
      <div className="row-between">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          CANCEL
        </button>
        <button
          type="button"
          className="btn btn-coral"
          disabled={!ready || busy}
          onClick={() => onSubmit({ body, sticker, file, mode, ghostSeconds })}
        >
          {busy ? "DROPPING…" : "DROP IT ▼"}
        </button>
      </div>
    </div>
  );
}
