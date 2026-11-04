"use client";

import { useState, type ReactNode } from "react";
import {
  COLORS,
  EYES,
  FACES,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  MASKS,
  normaliseHero,
  OUTFITS,
  PATTERNS,
  randomHero,
  SKINS,
  type HeroLook,
} from "@/lib/hero";
import { HeroSprite } from "./HeroSprite";

type Part = "look" | "suit" | "face" | "head" | "outfit";

const TABS: [Part, string][] = [
  ["look", "🙂 SKIN"],
  ["suit", "🎨 SUIT"],
  ["face", "👀 FACE"],
  ["head", "🎩 HEAD"],
  ["outfit", "🧥 GEAR"],
];

/** Build-your-own hero: full body here, the head is what shows in round avatars. */
export function HeroBuilder({
  initial,
  avatarKey,
  onSave,
}: {
  initial: unknown;
  avatarKey: string;
  onSave: (look: HeroLook) => Promise<void>;
}) {
  const saved = normaliseHero(initial, avatarKey);
  const [look, setLook] = useState<HeroLook>(saved);
  const [part, setPart] = useState<Part>("suit");
  const [busy, setBusy] = useState(false);
  const [hop, setHop] = useState(0);
  const dirty = !initial || JSON.stringify(look) !== JSON.stringify(saved);

  const set = (patch: Partial<HeroLook>) => {
    setLook((l) => ({ ...l, ...patch }));
    setHop((h) => h + 1);
  };

  const swatches = (label: string, list: readonly { key: string; hex: string }[], value: string, pick: (k: string) => void) => (
    <div className="builder-sub">
      <p className="lcd small">{label}</p>
      <div className="swatch-row" role="radiogroup" aria-label={label}>
        {list.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`swatch ${value === c.key ? "on" : ""}`}
            style={{ background: c.hex }}
            onClick={() => pick(c.key)}
            aria-label={`${label} ${"label" in c ? (c as { label: string }).label : c.key}`}
            aria-pressed={value === c.key}
          />
        ))}
      </div>
    </div>
  );

  function picks<K extends keyof HeroLook>(label: string, field: K, list: readonly { key: string; label: string }[], head: boolean): ReactNode {
    return (
      <div className="builder-sub">
        <p className="lcd small">{label}</p>
        <div className="builder-grid" role="radiogroup" aria-label={label}>
          {list.map((o) => {
            const on = look[field] === o.key;
            return (
              <button
                key={o.key}
                type="button"
                className={`builder-pick ${on ? "on" : ""}`}
                onClick={() => set({ [field]: o.key } as Partial<HeroLook>)}
                aria-pressed={on}
              >
                {head ? (
                  <span className="builder-head">
                    <HeroSprite look={{ ...look, [field]: o.key }} size={52} head still />
                  </span>
                ) : (
                  <HeroSprite look={{ ...look, [field]: o.key }} size={60} still />
                )}
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="builder">
      <div className="builder-stage">
        <span key={hop} className="builder-hop">
          <HeroSprite look={look} size={136} title="Your hero" />
        </span>
        <span className="builder-head" title="How you look in chats">
          <HeroSprite look={look} size={48} head still />
        </span>
      </div>

      <div className="seg builder-tabs builder-tabs-5" role="tablist" aria-label="Hero parts">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={part === k} className={part === k ? "on" : ""} onClick={() => setPart(k)}>
            {label}
          </button>
        ))}
      </div>

      {part === "look" && (
        <>
          {swatches("SKIN", SKINS, look.skin, (k) => set({ skin: k as HeroLook["skin"] }))}
          {swatches("HAIR COLOUR", HAIR_COLORS, look.hairColor, (k) => set({ hairColor: k as HeroLook["hairColor"] }))}
          {picks("HAIR", "hair", HAIR_STYLES, true)}
        </>
      )}

      {part === "suit" && (
        <>
          {swatches("COLOUR 1 · SUIT", COLORS, look.suit, (k) => set({ suit: k as HeroLook["suit"] }))}
          {swatches("COLOUR 2 · TRIM, MASK & BOOTS", COLORS, look.trim, (k) => set({ trim: k as HeroLook["trim"] }))}
          {picks("PATTERN", "pattern", PATTERNS, false)}
        </>
      )}

      {part === "face" && (
        <>
          {picks("MASK", "mask", MASKS, true)}
          {picks("EYES", "eyes", EYES, true)}
          {picks("PIERCINGS & MORE", "face", FACES, true)}
        </>
      )}

      {part === "head" && picks("HATS & HEADGEAR", "hat", HATS, true)}

      {part === "outfit" && picks("OUTFIT", "outfit", OUTFITS, false)}

      <div className="row-between gap">
        <button type="button" className="btn btn-violet" onClick={() => set(randomHero())}>
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
          {busy ? "SAVING…" : dirty ? "SAVE MY HERO" : "SAVED ✓"}
        </button>
      </div>
    </div>
  );
}
