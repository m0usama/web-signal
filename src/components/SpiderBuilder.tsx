"use client";

import { useState } from "react";
import {
  normaliseLook,
  randomLook,
  SPIDER_COLORS,
  SPIDER_EXTRAS,
  SPIDER_EYES,
  SPIDER_PATTERNS,
  type SpiderLook,
} from "@/lib/spider";
import { SpiderSprite } from "./SpiderSprite";

type Part = "colours" | "eyes" | "pattern" | "extra";

/** Build-your-own spider: two colours, eyes, pattern and an extra. */
export function SpiderBuilder({
  initial,
  avatarKey,
  onSave,
}: {
  initial: unknown;
  avatarKey: string;
  onSave: (look: SpiderLook) => Promise<void>;
}) {
  const saved = normaliseLook(initial, avatarKey);
  const [look, setLook] = useState<SpiderLook>(saved);
  const [part, setPart] = useState<Part>("colours");
  const [busy, setBusy] = useState(false);
  const [hop, setHop] = useState(0);
  const dirty = JSON.stringify(look) !== JSON.stringify(saved);

  const set = (patch: Partial<SpiderLook>) => {
    setLook((l) => ({ ...l, ...patch }));
    setHop((h) => h + 1);
  };

  return (
    <div className="builder">
      <div className="builder-stage">
        <span key={hop} className="builder-hop">
          <SpiderSprite look={look} size={150} thread title="Your spider" />
        </span>
      </div>

      <div className="seg builder-tabs" role="tablist" aria-label="Spider parts">
        {(
          [
            ["colours", "🎨 COLOURS"],
            ["eyes", "👀 EYES"],
            ["pattern", "▦ PATTERN"],
            ["extra", "🎀 EXTRA"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={part === k} className={part === k ? "on" : ""} onClick={() => setPart(k)}>
            {label}
          </button>
        ))}
      </div>

      {part === "colours" && (
        <div className="builder-colours">
          {(["body", "accent"] as const).map((slot) => (
            <div key={slot}>
              <p className="lcd small">{slot === "body" ? "COLOUR 1 · BODY" : "COLOUR 2 · PATTERN & KNEES"}</p>
              <div className="swatches" role="radiogroup" aria-label={slot === "body" ? "Body colour" : "Second colour"}>
                {SPIDER_COLORS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`swatch ${look[slot] === c.key ? "on" : ""}`}
                    style={{ background: c.hex }}
                    onClick={() => set({ [slot]: c.key })}
                    aria-label={`${slot === "body" ? "Body" : "Second"} colour ${c.label}`}
                    aria-pressed={look[slot] === c.key}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {part === "eyes" && (
        <div className="builder-grid" role="radiogroup" aria-label="Eyes">
          {SPIDER_EYES.map((e) => (
            <button key={e.key} type="button" className={`builder-pick ${look.eyes === e.key ? "on" : ""}`} onClick={() => set({ eyes: e.key })} aria-pressed={look.eyes === e.key}>
              <SpiderSprite look={{ ...look, eyes: e.key }} size={52} still />
              <span>{e.label}</span>
            </button>
          ))}
        </div>
      )}

      {part === "pattern" && (
        <div className="builder-grid" role="radiogroup" aria-label="Pattern">
          {SPIDER_PATTERNS.map((p) => (
            <button key={p.key} type="button" className={`builder-pick ${look.pattern === p.key ? "on" : ""}`} onClick={() => set({ pattern: p.key })} aria-pressed={look.pattern === p.key}>
              <SpiderSprite look={{ ...look, pattern: p.key }} size={52} still />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      )}

      {part === "extra" && (
        <div className="builder-grid" role="radiogroup" aria-label="Extra">
          {SPIDER_EXTRAS.map((x) => (
            <button key={x.key} type="button" className={`builder-pick ${look.extra === x.key ? "on" : ""}`} onClick={() => set({ extra: x.key })} aria-pressed={look.extra === x.key}>
              <SpiderSprite look={{ ...look, extra: x.key }} size={52} still />
              <span>{x.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="row-between gap">
        <button type="button" className="btn btn-violet" onClick={() => set(randomLook())}>
          🎲 RANDOM
        </button>
        <button
          type="button"
          className="btn btn-coral"
          disabled={!dirty || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onSave(look);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "SAVING…" : dirty ? "SAVE MY SPIDER" : "SAVED ✓"}
        </button>
      </div>
    </div>
  );
}
