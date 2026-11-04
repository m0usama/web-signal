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

/** True when a saved look exists (otherwise the photo avatar is used). */
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

// ------------------------------------------------------------------ pixels

export const W = 24;
export const H = 31;
/** The square around the head, for round avatars: [x, y, size]. */
export const HEAD_BOX: [number, number, number] = [2, -1, 20];

const INK = "#10101E";
const WHITE = "#F8F5FF";
const PINK = "#FF5C8A";
const YELLOW = "#FFD84D";
const SILVER = "#D6D9E8";
const hexOf = <T extends readonly { key: string; hex: string }[]>(list: T, k: string) => list.find((x) => x.key === k)!.hex;

function shade(h: string, f: number) {
  const n = parseInt(h.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${((1 << 24) | (c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).slice(1)}`;
}
/** A colour that reads on top of `bg` (for LED eyes on a visor). */
function glowOn(bg: string) {
  const n = parseInt(bg.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? INK : "#7DF9FF";
}

const HX = 12;
const HY = 9;
const RX = 8.2;
const RY = 7.6;
const inHead = (x: number, y: number) => ((x + 0.5 - HX) / RX) ** 2 + ((y + 0.5 - HY) / RY) ** 2 <= 1;
const nearHead = (x: number, y: number) => ((x + 0.5 - HX) / (RX + 1)) ** 2 + ((y + 0.5 - HY) / (RY + 1)) ** 2 <= 1;

const EMBLEMS: Record<string, string[]> = {
  star: ["..x..", ".xxx.", "xxxxx", ".x.x."],
  heart: [".x.x.", "xxxxx", ".xxx.", "..x.."],
  bolt: ["..xx", ".xx.", "xxxx", ".xx.", "xx.."],
  moon: [".xxx", "xx..", "xx..", ".xxx"],
};

const EYE_Y = 9;
const EYE_L = 7;
const EYE_R = 14;

export function heroPixels(look: HeroLook, opts: { blink?: boolean } = {}): string[][] {
  const g: string[][] = Array.from({ length: H }, () => Array<string>(W).fill(""));
  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c;
  };
  const get = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? g[y][x] : "");
  const rect = (x0: number, y0: number, x1: number, y1: number, c: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c);
  };

  const skin = hexOf(SKINS, look.skin);
  const skinShade = shade(skin, 0.86);
  const hair = hexOf(HAIR_COLORS, look.hairColor);
  const hairShade = shade(hair, 0.78);
  const suit = hexOf(COLORS, look.suit);
  const trim = hexOf(COLORS, look.trim);
  const boots = shade(trim, 0.7);
  const fullMask = look.mask === "ninja" || look.mask === "visor";

  // ---- cape / long coat tails (behind)
  if (look.outfit === "cape") {
    for (let y = 16; y <= 28; y++) {
      const spread = Math.min(8, 4 + Math.floor((y - 16) / 2));
      for (let x = HX - spread; x < HX + spread; x++) set(x, y, shade(trim, 0.85));
    }
  }
  if (look.outfit === "coat") {
    rect(6, 22, 9, 27, shade(trim, 0.9));
    rect(14, 22, 17, 27, shade(trim, 0.9));
  }

  // ---- legs + boots
  rect(8, 23, 10, 26, trim);
  rect(13, 23, 15, 26, trim);
  rect(7, 27, 10, 28, boots);
  rect(13, 27, 16, 28, boots);
  // ---- arms + torso
  rect(5, 17, 6, 21, suit);
  rect(17, 17, 18, 21, suit);
  rect(5, 22, 6, 22, fullMask ? trim : skin);
  rect(17, 22, 18, 22, fullMask ? trim : skin);
  rect(7, 16, 16, 22, suit);
  rect(7, 22, 16, 22, trim);
  set(11, 22, YELLOW);
  set(12, 22, YELLOW);

  // pattern
  const torso = (x: number, y: number) => x >= 7 && x <= 16 && y >= 16 && y <= 21;
  for (let y = 16; y <= 21; y++)
    for (let x = 5; x <= 18; x++) {
      const isTorso = torso(x, y);
      const isSleeve = (x === 5 || x === 6 || x === 17 || x === 18) && y >= 17 && y <= 21;
      if (!isTorso && !isSleeve) continue;
      if (look.pattern === "split" && x >= 12) set(x, y, trim);
      if (look.pattern === "stripes" && y % 2 === 1) set(x, y, trim);
      if (look.pattern === "chevron" && isTorso && (y - 16 === Math.abs(x - 11.5) - 0.5 || y - 17 === Math.abs(x - 11.5) - 0.5)) set(x, y, trim);
    }
  const emblem = EMBLEMS[look.pattern];
  if (emblem) {
    const ox = 12 - Math.ceil(emblem[0].length / 2);
    emblem.forEach((row, j) => [...row].forEach((ch, i) => ch === "x" && set(ox + i, 17 + j, look.trim === look.suit ? WHITE : trim)));
  }

  // ---- outfit layers over the torso
  const jacket = shade(trim, 0.92);
  if (look.outfit === "coat" || look.outfit === "jacket") {
    rect(5, 16, 8, 22, jacket);
    rect(15, 16, 18, 22, jacket);
    rect(5, 22, 6, 22, fullMask ? trim : skin);
    rect(17, 22, 18, 22, fullMask ? trim : skin);
    set(9, 16, jacket);
    set(14, 16, jacket);
  }
  if (look.outfit === "scarf") {
    rect(7, 15, 16, 16, trim);
    rect(14, 17, 15, 19, trim);
  }
  if (look.outfit === "tie") {
    rect(11, 16, 12, 16, trim);
    rect(11, 17, 12, 20, shade(trim, 0.85));
    set(11, 21, shade(trim, 0.85));
  }
  if (look.outfit === "spikes") {
    for (const [x, y] of [[4, 16], [5, 15], [6, 16], [17, 16], [18, 15], [19, 16], [3, 17], [20, 17]]) set(x, y, SILVER);
  }

  // ---- head
  for (let y = 0; y < 18; y++) for (let x = 0; x < W; x++) if (inHead(x, y)) set(x, y, skin);
  set(3, 10, skin);
  set(20, 10, skin);
  for (let x = 6; x <= 17; x++) if (inHead(x, 15) && !inHead(x, 16)) set(x, 15, skinShade);

  // ---- hair (hidden under full masks)
  const hairAt = (x: number, y: number, c = hair) => (inHead(x, y) || nearHead(x, y)) && set(x, y, c);
  const style = look.hair;
  if (fullMask) {
    // nothing: the mask covers the head
  } else if (style === "hood") {
    for (let y = 0; y < 18; y++) for (let x = 0; x < W; x++) if (nearHead(x, y) && !(inHead(x, y) && y >= 6 && x >= 6 && x <= 17)) set(x, y, suit);
    for (let x = 6; x <= 17; x++) set(x, 5, shade(suit, 0.8));
  } else if (style === "curly") {
    for (let y = 0; y < 18; y++)
      for (let x = 0; x < W; x++) {
        const out = ((x + 0.5 - HX) / (RX + 2)) ** 2 + ((y + 0.5 - HY + 1) / (RY + 1.6)) ** 2 <= 1;
        if (out && (y <= 5 || !inHead(x, y) || x <= 4 || x >= 19) && y <= 13) set(x, y, (x + y) % 3 === 0 ? hairShade : hair);
      }
  } else {
    for (let y = 0; y <= 5; y++) for (let x = 0; x < W; x++) if (inHead(x, y) || (nearHead(x, y) && y <= 4)) hairAt(x, y);
    for (let y = 6; y <= 7; y++) {
      hairAt(4, y);
      hairAt(5, y);
      hairAt(18, y);
      hairAt(19, y);
    }
    for (const x of [7, 8, 10, 11, 13, 15, 16]) set(x, 6, hair);
    if (style === "spiky")
      for (const [x, y] of [[6, 0], [7, 1], [10, 0], [11, 0], [14, 0], [15, 1], [18, 1], [5, 2], [19, 3]]) {
        set(x, y, hair);
        set(x, y + 1, hair);
      }
    if (style === "long")
      for (let y = 6; y <= 19; y++) {
        for (const x of [2, 3, 4]) if (y < 19 || x > 2) set(x, y, y > 15 ? hairShade : hair);
        for (const x of [19, 20, 21]) if (y < 19 || x < 21) set(x, y, y > 15 ? hairShade : hair);
      }
    if (style === "ponytail") for (let y = 3; y <= 14; y++) for (const x of [20, 21, 22]) if (x - 20 <= (y < 8 ? 2 : 1)) set(x, y, y > 10 ? hairShade : hair);
    if (style === "buns") for (const cx of [4, 19]) for (let y = 0; y <= 3; y++) for (let x = cx - 2; x <= cx + 2; x++) if ((x - cx) ** 2 + (y - 1.5) ** 2 <= 5) set(x, y, hair);
  }

  // ---- full masks
  if (look.mask === "ninja") {
    for (let y = 0; y < 18; y++) for (let x = 0; x < W; x++) if (inHead(x, y)) set(x, y, suit);
    rect(4, EYE_Y - 1, 19, EYE_Y + 3, skin); // eye slit
    for (let x = 4; x <= 19; x++) if (!inHead(x, EYE_Y)) for (let y = EYE_Y - 1; y <= EYE_Y + 3; y++) set(x, y, "");
    set(20, 6, trim); // knot tails
    set(21, 5, trim);
    set(21, 7, trim);
  }
  if (look.mask === "visor") {
    for (let y = 0; y < 18; y++) for (let x = 0; x < W; x++) if (inHead(x, y)) set(x, y, suit);
    for (let y = EYE_Y - 1; y <= EYE_Y + 3; y++) for (let x = 4; x <= 19; x++) if (inHead(x, y)) set(x, y, trim);
    for (let x = 6; x <= 9; x++) set(x, EYE_Y - 1, shade(trim, 1.25)); // shine
    set(12, 2, shade(suit, 1.2));
    set(12, 3, shade(suit, 1.2));
  }

  // ---- outline
  const filled = g.map((row) => row.map((c) => !!c));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (!filled[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => filled[y + dy]?.[x + dx])) set(x, y, INK);
  for (let y = 23; y <= 28; y++) set(11, y, get(11, y) ? INK : "");
  set(12, 23, INK);
  for (let y = 17; y <= 21; y++) {
    if (get(7, y) === suit || get(7, y) === trim) set(7, y, INK);
    if (get(16, y) === suit || get(16, y) === trim) set(16, y, INK);
  }

  // ---- eyes (on the visor they glow like LEDs)
  const eyeInk = look.mask === "visor" ? glowOn(trim) : INK;
  const eyeWhite = look.mask === "visor" ? glowOn(trim) : WHITE;
  const ey = EYE_Y;
  const eye = (x0: number, kind: string) => {
    if (opts.blink && kind !== "shades") {
      rect(x0, ey + 1, x0 + 2, ey + 1, eyeInk);
      return;
    }
    switch (kind) {
      case "big":
      case "fierce":
        if (look.mask === "visor") {
          rect(x0, ey, x0 + 2, ey + 1, eyeInk);
        } else {
          rect(x0, ey, x0 + 2, ey + 2, INK);
          set(x0, ey, eyeWhite);
          set(x0 + 1, ey, kind === "fierce" ? INK : eyeWhite);
        }
        if (kind === "fierce") {
          set(x0 < HX ? x0 : x0 + 2, ey - 2, look.mask === "visor" ? eyeInk : INK);
          set(x0 + 1, ey - 1, eyeInk);
          set(x0 < HX ? x0 + 2 : x0, ey - 1, eyeInk);
        }
        break;
      case "happy":
        set(x0, ey + 1, eyeInk);
        set(x0 + 1, ey, eyeInk);
        set(x0 + 2, ey + 1, eyeInk);
        break;
      case "sleepy":
        rect(x0, ey + 1, x0 + 2, ey + 1, eyeInk);
        break;
      case "hearts":
        set(x0, ey, PINK);
        set(x0 + 2, ey, PINK);
        rect(x0, ey + 1, x0 + 2, ey + 1, PINK);
        set(x0 + 1, ey + 2, PINK);
        break;
      case "stars":
        set(x0 + 1, ey, YELLOW);
        rect(x0, ey + 1, x0 + 2, ey + 1, YELLOW);
        set(x0 + 1, ey + 2, YELLOW);
        break;
    }
  };
  if (look.eyes === "wink") {
    eye(EYE_L, "big");
    eye(EYE_R, "happy");
  } else if (look.eyes === "shades") {
    rect(EYE_L - 1, ey, EYE_R + 3, ey, INK);
    rect(EYE_L - 1, ey + 1, EYE_L + 3, ey + 2, INK);
    rect(EYE_R - 1, ey + 1, EYE_R + 3, ey + 2, INK);
    set(EYE_L, ey + 1, WHITE);
    set(EYE_R, ey + 1, WHITE);
  } else {
    eye(EYE_L, look.eyes);
    eye(EYE_R, look.eyes);
  }

  // ---- mouth, cheeks (not under a full mask)
  if (!fullMask) {
    if (look.eyes === "fierce") {
      rect(10, 13, 13, 13, INK);
    } else {
      set(11, 13, INK);
      set(12, 13, INK);
      set(10, 12, INK);
      set(13, 12, INK);
    }
    if (look.eyes !== "shades") {
      set(5, 12, PINK);
      set(18, 12, PINK);
    }
  }
  if (look.mask === "bandana") {
    for (let y = 11; y <= 16; y++) for (let x = 3; x <= 20; x++) if (inHead(x, y)) set(x, y, trim);
    for (let x = 6; x <= 17; x += 3) set(x, 14, shade(trim, 0.75));
  }
  if (look.mask === "domino") {
    rect(5, ey - 1, 18, ey + 3, trim);
    rect(EYE_L, ey, EYE_L + 2, ey + 2, WHITE);
    rect(EYE_R, ey, EYE_R + 2, ey + 2, WHITE);
    set(EYE_L + 1, ey + 1, INK);
    set(EYE_R + 1, ey + 1, INK);
  }

  // ---- face extras
  const faceVisible = !fullMask;
  switch (look.face) {
    case "nosering":
      if (faceVisible && look.mask !== "bandana") {
        set(12, 11, skinShade);
        set(13, 12, YELLOW);
      }
      break;
    case "browring":
      if (faceVisible) {
        set(16, ey - 2, SILVER);
        set(17, ey - 2, SILVER);
      }
      break;
    case "earrings":
      set(3, 12, YELLOW);
      set(20, 12, YELLOW);
      set(3, 13, YELLOW);
      set(20, 13, YELLOW);
      break;
    case "freckles":
      if (faceVisible && look.mask !== "bandana") for (const [x, y] of [[6, 11], [8, 12], [15, 11], [17, 12], [7, 13], [16, 13]]) set(x, y, shade(skin, 0.72));
      break;
    case "glasses":
      if (faceVisible && look.eyes !== "shades") {
        for (const x0 of [EYE_L - 1, EYE_R - 1]) {
          rect(x0, ey - 1, x0 + 4, ey - 1, INK);
          rect(x0, ey + 3, x0 + 4, ey + 3, INK);
          rect(x0, ey - 1, x0, ey + 3, INK);
          rect(x0 + 4, ey - 1, x0 + 4, ey + 3, INK);
        }
        set(11, ey, INK);
        set(12, ey, INK);
      }
      break;
    case "eyepatch":
      if (look.mask !== "visor") {
        rect(EYE_R - 1, ey - 1, EYE_R + 3, ey + 3, INK);
        for (let x = 4; x <= 19; x++) if (x < EYE_R - 1 || x > EYE_R + 3) set(x, ey - 3 + Math.round((x - 4) / 8), INK);
      }
      break;
  }

  // ---- hats
  switch (look.hat) {
    case "cap":
      for (let y = 0; y <= 4; y++) for (let x = 0; x < W; x++) if (nearHead(x, y)) set(x, y, trim);
      rect(12, 5, 21, 5, shade(trim, 0.75));
      set(12, 1, WHITE);
      break;
    case "beanie":
      for (let y = 0; y <= 5; y++) for (let x = 0; x < W; x++) if (nearHead(x, y)) set(x, y, y >= 4 ? shade(trim, 0.8) : trim);
      for (let x = 10; x <= 13; x++) set(x, 0, WHITE);
      break;
    case "headphones":
      for (let a = Math.PI * 1.1; a <= Math.PI * 1.9; a += 0.05) set(Math.round(HX - 0.5 + Math.cos(a) * (RX + 1)), Math.round(HY + Math.sin(a) * (RY + 1)), INK);
      rect(2, 8, 4, 12, INK);
      rect(19, 8, 21, 12, INK);
      rect(3, 9, 3, 11, trim);
      rect(20, 9, 20, 11, trim);
      break;
    case "goggles":
      rect(4, 4, 19, 4, INK);
      for (const cx of [8, 15]) {
        rect(cx - 2, 3, cx + 1, 5, INK);
        rect(cx - 1, 4, cx, 4, "#7DF9FF");
      }
      break;
    case "bow":
      for (const [x, y] of [[15, 0], [16, 0], [15, 1], [16, 1], [17, 1], [18, 2], [19, 1], [20, 0], [19, 0], [20, 1], [15, 2], [20, 2]]) set(x, y, PINK);
      set(18, 1, shade(PINK, 0.75));
      break;
    case "crown":
      rect(8, 0, 15, 2, YELLOW);
      set(11, 1, PINK);
      set(12, 1, PINK);
      for (const x of [9, 10, 13, 14]) set(x, 0, "");
      break;
    case "catears":
      for (const [x, y] of [[4, 0], [5, 0], [4, 1], [5, 1], [6, 1], [18, 0], [19, 0], [17, 1], [18, 1], [19, 1]]) set(x, y, look.mask === "none" ? hair : suit);
      set(5, 1, PINK);
      set(18, 1, PINK);
      break;
    case "horns":
      for (const [x, y] of [[4, 2], [4, 1], [5, 0], [19, 2], [19, 1], [18, 0], [5, 1], [18, 1]]) set(x, y, SILVER);
      break;
    case "halo":
      rect(8, 0, 15, 0, YELLOW);
      set(7, 0, shade(YELLOW, 0.8));
      set(16, 0, shade(YELLOW, 0.8));
      break;
    case "mohawk":
      for (let x = 9; x <= 14; x++) {
        set(x, 0, x % 2 ? trim : shade(trim, 0.8));
        set(x, 1, trim);
      }
      set(10, 0, trim);
      set(12, 0, trim);
      break;
  }
  return g;
}

export function heroRuns(look: HeroLook, opts: { blink?: boolean } = {}) {
  const g = heroPixels(look, opts);
  const runs: { x: number; y: number; w: number; c: string }[] = [];
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const c = g[y][x];
      if (!c) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < W && g[y][x + w] === c) w++;
      runs.push({ x, y, w, c });
      x += w;
    }
  }
  return runs;
}
