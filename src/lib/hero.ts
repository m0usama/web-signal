/**
 * Build-your-own pixel hero (an original chibi character).
 * The full body is used for the builder, the start screen and the idle
 * swing; round avatars show just the head.
 */

export const SKINS = [
  { key: "s1", hex: "#FFE0C7" },
  { key: "s2", hex: "#F6C9A3" },
  { key: "s3", hex: "#E0A77E" },
  { key: "s4", hex: "#C08159" },
  { key: "s5", hex: "#8D5A3B" },
  { key: "s6", hex: "#5E3A26" },
] as const;

export const COLORS = [
  { key: "red", hex: "#E2223B", label: "RED" },
  { key: "blue", hex: "#1F4FE0", label: "BLUE" },
  { key: "sky", hex: "#6FA8FF", label: "SKY" },
  { key: "violet", hex: "#A75CFF", label: "VIOLET" },
  { key: "pink", hex: "#FF65AD", label: "PINK" },
  { key: "mint", hex: "#3FD08A", label: "MINT" },
  { key: "gold", hex: "#FFC93C", label: "GOLD" },
  { key: "orange", hex: "#FF8A3D", label: "ORANGE" },
  { key: "white", hex: "#F8F5FF", label: "WHITE" },
  { key: "grey", hex: "#8B8FA8", label: "GREY" },
  { key: "black", hex: "#2A2A44", label: "BLACK" },
  { key: "teal", hex: "#14B8C4", label: "TEAL" },
] as const;

export const HAIR_COLORS = [
  { key: "black", hex: "#1E1B2E" },
  { key: "brown", hex: "#6B3E26" },
  { key: "blonde", hex: "#F2C94C" },
  { key: "ginger", hex: "#D9622B" },
  { key: "white", hex: "#EDEBF7" },
  { key: "pink", hex: "#FF8AC2" },
  { key: "blue", hex: "#4E7BFF" },
  { key: "purple", hex: "#8E5BFF" },
] as const;

export const HAIR_STYLES = [
  { key: "short", label: "SHORT" },
  { key: "spiky", label: "SPIKY" },
  { key: "long", label: "LONG" },
  { key: "ponytail", label: "PONYTAIL" },
  { key: "buns", label: "BUNS" },
  { key: "curly", label: "CURLY" },
  { key: "hood", label: "HOOD UP" },
] as const;

export const EYES = [
  { key: "big", label: "BIG EYES" },
  { key: "happy", label: "HAPPY" },
  { key: "wink", label: "WINK" },
  { key: "sleepy", label: "SLEEPY" },
  { key: "hearts", label: "IN LOVE" },
  { key: "stars", label: "STARRY" },
  { key: "fierce", label: "FIERCE" },
  { key: "shades", label: "COOL" },
] as const;

export const MASKS = [
  { key: "none", label: "NO MASK" },
  { key: "ninja", label: "NINJA" },
  { key: "visor", label: "VISOR HELMET" },
  { key: "bandana", label: "BANDANA" },
  { key: "domino", label: "EYE MASK" },
] as const;

export const PATTERNS = [
  { key: "plain", label: "PLAIN" },
  { key: "split", label: "DUO SPLIT" },
  { key: "stripes", label: "STRIPES" },
  { key: "chevron", label: "CHEVRON" },
  { key: "star", label: "STAR" },
  { key: "heart", label: "HEART" },
  { key: "bolt", label: "BOLT" },
  { key: "moon", label: "MOON" },
] as const;

export const HATS = [
  { key: "none", label: "NONE" },
  { key: "cap", label: "CAP" },
  { key: "beanie", label: "BEANIE" },
  { key: "crown", label: "CROWN" },
  { key: "bow", label: "BOW" },
  { key: "headphones", label: "HEADPHONES" },
  { key: "goggles", label: "GOGGLES" },
  { key: "catears", label: "CAT EARS" },
  { key: "horns", label: "HORNS" },
  { key: "halo", label: "HALO" },
  { key: "mohawk", label: "SPIKY MOHAWK" },
] as const;

export const FACES = [
  { key: "none", label: "NONE" },
  { key: "nosering", label: "NOSE RING" },
  { key: "browring", label: "BROW PIERCING" },
  { key: "earrings", label: "EARRINGS" },
  { key: "freckles", label: "FRECKLES" },
  { key: "glasses", label: "ROUND GLASSES" },
  { key: "eyepatch", label: "EYE PATCH" },
] as const;

export const OUTFITS = [
  { key: "none", label: "SUIT ONLY" },
  { key: "coat", label: "LONG COAT" },
  { key: "jacket", label: "JACKET" },
  { key: "cape", label: "CAPE" },
  { key: "scarf", label: "SCARF" },
  { key: "spikes", label: "SPIKED SHOULDERS" },
  { key: "tie", label: "TIE" },
] as const;

type K<T extends readonly { key: string }[]> = T[number]["key"];
export interface HeroLook {
  skin: K<typeof SKINS>;
  hair: K<typeof HAIR_STYLES>;
  hairColor: K<typeof HAIR_COLORS>;
  suit: K<typeof COLORS>;
  trim: K<typeof COLORS>;
  pattern: K<typeof PATTERNS>;
  eyes: K<typeof EYES>;
  mask: K<typeof MASKS>;
  hat: K<typeof HATS>;
  face: K<typeof FACES>;
  outfit: K<typeof OUTFITS>;
}

export const DEFAULT_HEROES: Record<string, HeroLook> = {
  a: { skin: "s1", hair: "long", hairColor: "blonde", suit: "violet", trim: "pink", pattern: "split", eyes: "big", mask: "none", hat: "bow", face: "earrings", outfit: "none" },
  b: { skin: "s3", hair: "spiky", hairColor: "brown", suit: "blue", trim: "gold", pattern: "bolt", eyes: "fierce", mask: "visor", hat: "none", face: "none", outfit: "jacket" },
  c: { skin: "s2", hair: "short", hairColor: "black", suit: "teal", trim: "black", pattern: "stripes", eyes: "shades", mask: "none", hat: "headphones", face: "none", outfit: "none" },
};

const has = <T extends readonly { key: string }[]>(list: T, k: unknown): k is K<T> =>
  typeof k === "string" && list.some((x) => x.key === k);

/** True when a saved look exists. */
export function hasLook(raw: unknown): boolean {
  return !!raw && typeof raw === "object" && has(SKINS, (raw as Record<string, unknown>).skin);
}

export function normaliseHero(raw: unknown, avatarKey = "b"): HeroLook {
  const d = DEFAULT_HEROES[avatarKey] ?? DEFAULT_HEROES.b;
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    skin: has(SKINS, r.skin) ? r.skin : d.skin,
    hair: has(HAIR_STYLES, r.hair) ? r.hair : d.hair,
    hairColor: has(HAIR_COLORS, r.hairColor) ? r.hairColor : d.hairColor,
    suit: has(COLORS, r.suit) ? r.suit : d.suit,
    trim: has(COLORS, r.trim) ? r.trim : d.trim,
    pattern: has(PATTERNS, r.pattern) ? r.pattern : d.pattern,
    eyes: has(EYES, r.eyes) ? r.eyes : d.eyes,
    mask: has(MASKS, r.mask) ? r.mask : d.mask,
    hat: has(HATS, r.hat) ? r.hat : d.hat,
    face: has(FACES, r.face) ? r.face : d.face,
    outfit: has(OUTFITS, r.outfit) ? r.outfit : d.outfit,
  };
}

export function randomHero(): HeroLook {
  const p = <T extends readonly { key: string }[]>(a: T) => a[Math.floor(Math.random() * a.length)].key as K<T>;
  const suit = p(COLORS);
  let trim = p(COLORS);
  if (trim === suit) trim = suit === "white" ? "red" : "white";
  return {
    skin: p(SKINS), hair: p(HAIR_STYLES), hairColor: p(HAIR_COLORS), suit, trim, pattern: p(PATTERNS), eyes: p(EYES),
    mask: Math.random() < 0.5 ? "none" : p(MASKS), hat: Math.random() < 0.4 ? "none" : p(HATS), face: Math.random() < 0.5 ? "none" : p(FACES), outfit: p(OUTFITS),
  };
}

// ------------------------------------------------------------------ drawing

/** Art is drawn on a 120 × 140 canvas (a chubby, big-headed hero); round avatars crop to the head. */
export const W = 120;
export const H = 140;
/** The square around the head, for round avatars: [x, y, size]. */
export const HEAD_BOX: [number, number, number] = [6, -2, 108];

export const hexOf = <T extends readonly { key: string; hex: string }[]>(list: T, k: string) => list.find((x) => x.key === k)!.hex;

export function shade(h: string, f: number) {
  const n = parseInt(h.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${((1 << 24) | (c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).slice(1)}`;
}

/** A colour that reads on top of `bg` (for glowing eyes on a visor). */
export function glowOn(bg: string) {
  const n = parseInt(bg.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? "#10101E" : "#7DF9FF";
}
