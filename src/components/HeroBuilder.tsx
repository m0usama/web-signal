"use client";

import { useState } from "react";
import {
  ACCESSORIES,
  cleanFace,
  EYEWEAR,
  FACE_PRESETS,
  faceChars,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  MASKS,
  normaliseHero,
  OUTFITS,
  randomHero,
  SKINS,
  type HeroLook,
} from "@/lib/hero";
import { HeroSprite } from "./HeroSprite";

type Part = "look" | "face" | "hat" | "mask" | "eyewear" | "accessory" | "outfit";

const TABS: [Part, string, string][] = [
  ["look", "🎨", "SKIN & HAIR"],
  ["face", "^_^", "FACE"],
  ["hat", "🎩", "HATS"],
  ["mask", "🎭", "MASKS"],
  ["eyewear", "👓", "EYEWEAR"],
  ["accessory", "🎀", "EXTRAS"],
  ["outfit", "👕", "OUTFITS"],
];

/** Build-your-own hero: full body here, the head is what shows in round avatars. Everything is free. */
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
  const [part, setPart] = useState<Part>("face");
  const [busy, setBusy] = useState(false);
  const [hop, setHop] = useState(0);
  const [faceDraft, setFaceDraft] = useState(saved.face);
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
            aria-label={`${label} ${c.key}`}
            aria-pressed={value === c.key}
          />
        ))}
      </div>
    </div>
  );

  function picks<F extends Exclude<keyof HeroLook, "face">>(label: string, field: F, list: readonly { key: string; label: string }[], head: boolean) {
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
                title={o.label}
              >
                {o.key === "none" ? (
                  <span className="builder-none" aria-hidden>
                    ⦸
                  </span>
                ) : head ? (
                  <span className="builder-head">
                    <HeroSprite look={{ ...look, [field]: o.key }} size={56} head still />
                  </span>
                ) : (
                  <HeroSprite look={{ ...look, [field]: o.key }} size={64} still />
                )}
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const draftChars = faceChars(faceDraft);
  const draftOk = cleanFace(faceDraft) !== null;

  return (
    <div className="builder">
      <div className="builder-stage">
        <span key={hop} className="builder-hop">
          <HeroSprite look={look} size={150} title="Your hero" />
        </span>
        <span className="builder-head" title="How you look in chats">
          <HeroSprite look={look} size={48} head still />
        </span>
      </div>

      <div className="builder-tabbar" role="tablist" aria-label="Hero parts">
        {TABS.map(([k, icon, label]) => (
          <button key={k} type="button" role="tab" aria-selected={part === k} className={part === k ? "on" : ""} onClick={() => setPart(k)}>
            <span className="builder-tab-ico" aria-hidden>
              {icon}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {part === "look" && (
        <>
          {swatches("SKIN COLOUR", SKINS, look.skin, (k) => set({ skin: k as HeroLook["skin"] }))}
          {swatches("HAIR COLOUR", HAIR_COLORS, look.hairColor, (k) => set({ hairColor: k as HeroLook["hairColor"] }))}
          {picks("HAIR", "hair", HAIR_STYLES, true)}
        </>
      )}

      {part === "face" && (
        <div className="builder-sub">
          <p className="lcd small">EXPRESSION · TYPE ANY 3 CHARACTERS</p>
          <div className="face-maker">
            <input
              className="field face-input"
              value={faceDraft}
              onChange={(e) => {
                const chars = faceChars(e.target.value).slice(0, 3);
                const next = chars.join("");
                setFaceDraft(next);
                const ok = cleanFace(next);
                if (ok) set({ face: ok });
              }}
              aria-label="Face: left eye, mouth, right eye"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
            />
            <span className={`face-count ${draftOk ? "ok" : ""}`}>{draftChars.length}/3</span>
          </div>
          <p className="fine">1st = left eye · 2nd = mouth · 3rd = right eye. Keep it kind 💜</p>
          <div className="builder-grid face-grid" role="radiogroup" aria-label="Ready-made faces">
            {FACE_PRESETS.map((f) => (
              <button
                key={f}
                type="button"
                className={`builder-pick ${look.face === f ? "on" : ""}`}
                onClick={() => {
                  setFaceDraft(f);
                  set({ face: f });
                }}
                aria-pressed={look.face === f}
              >
                <span className="builder-head">
                  <HeroSprite look={{ ...look, face: f, mask: "none", eyewear: "none" }} size={56} head still />
                </span>
                <span>{f}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {part === "hat" && picks("HATS · ALL FREE", "hat", HATS, true)}
      {part === "mask" && picks("MASKS · ALL FREE", "mask", MASKS, true)}
      {part === "eyewear" && picks("EYEWEAR · ALL FREE", "eyewear", EYEWEAR, true)}
      {part === "accessory" && picks("ACCESSORIES · ALL FREE", "accessory", ACCESSORIES, false)}
      {part === "outfit" && picks("OUTFITS · ALL FREE", "outfit", OUTFITS, false)}

      <div className="row-between gap builder-actions">
        <button
          type="button"
          className="btn btn-violet"
          onClick={() => {
            const r = randomHero();
            setFaceDraft(r.face);
            set(r);
          }}
        >
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
