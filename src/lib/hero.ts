/**
 * Build-your-own hero (an original chubby chibi character).
 * The full body is used for the builder, the start screen and the idle
 * swing; round avatars show just the head. Every item is free.
 */

export const SKINS = [
  { key: "s1", hex: "#FFE3CF" },
  { key: "s2", hex: "#F6C9A3" },
  { key: "s3", hex: "#E7AE84" },
  { key: "s4", hex: "#C98B5F" },
  { key: "s5", hex: "#9C6440" },
  { key: "s6", hex: "#6B4229" },
  { key: "s7", hex: "#4A2C1B" },
  { key: "s8", hex: "#BFE3B4" },
  { key: "s9", hex: "#B9D3FF" },
  { key: "s10", hex: "#E3C6FF" },
] as const;

export const HAIR_COLORS = [
  { key: "black", hex: "#1E1B2E" },
  { key: "brown", hex: "#6B3E26" },
  { key: "chestnut", hex: "#9A5A2E" },
  { key: "blonde", hex: "#F2C94C" },
  { key: "ginger", hex: "#D9622B" },
  { key: "silver", hex: "#D6D9E8" },
  { key: "pink", hex: "#FF8AC2" },
  { key: "blue", hex: "#4E7BFF" },
  { key: "purple", hex: "#8E5BFF" },
  { key: "mint", hex: "#5FE0B0" },
] as const;

export const HAIR_STYLES = [
  { key: "short", label: "SHORT" },
  { key: "spiky", label: "SPIKY" },
  { key: "long", label: "LONG" },
  { key: "bob", label: "BOB" },
  { key: "ponytail", label: "PONYTAIL" },
  { key: "pigtails", label: "PIGTAILS" },
  { key: "buns", label: "BUNS" },
  { key: "curly", label: "CURLY" },
  { key: "mohawk", label: "MOHAWK" },
  { key: "bald", label: "BALD" },
] as const;

/** Ready-made faces; people can also type any 3 characters. */
export const FACE_PRESETS = [
  "•_•", "^_^", "^‿^", "o_o", "O_O", "-_-", ">_<", "x_x", "*_*", "@_@",
  "♥_♥", "T_T", "u_u", "^w^", "•ω•", ";_;", "=_=", "0_0", "^o^", "•3•",
  ">w<", "'_'", "~_~", "+_+", "•D•", "-P-", "^▽^", "•.•",
] as const;

export const HATS = [
  { key: "none", label: "NONE" },
  { key: "beanie", label: "BEANIE" },
  { key: "knit", label: "KNIT BEANIE" },
  { key: "rainbow", label: "RAINBOW BEANIE" },
  { key: "cap", label: "CAP" },
  { key: "trucker", label: "TRUCKER CAP" },
  { key: "propeller", label: "PROPELLER" },
  { key: "bucket", label: "BUCKET HAT" },
  { key: "zebra", label: "ZEBRA BUCKET" },
  { key: "floral", label: "FLORAL BUCKET" },
  { key: "duck", label: "DUCK HAT" },
  { key: "frog", label: "FROG HAT" },
  { key: "sunhat", label: "SUN HAT" },
  { key: "boater", label: "STRAW BOATER" },
  { key: "fedora", label: "FEDORA" },
  { key: "party", label: "PARTY HAT" },
  { key: "witch", label: "WITCH HAT" },
  { key: "grad", label: "GRAD CAP" },
  { key: "crown", label: "CROWN" },
  { key: "jewels", label: "JEWEL CROWN" },
  { key: "jester", label: "JESTER" },
  { key: "pirate", label: "PIRATE + PARROT" },
  { key: "viking", label: "VIKING" },
  { key: "firefighter", label: "FIREFIGHTER" },
  { key: "chef", label: "CHEF" },
  { key: "sailor", label: "SAILOR CAP" },
  { key: "pear", label: "PEAR HOOD" },
  { key: "melon", label: "MELON HOOD" },
  { key: "orange", label: "ORANGE HOOD" },
  { key: "watermelon", label: "WATERMELON" },
  { key: "strawberry", label: "STRAWBERRY" },
  { key: "egg", label: "FRIED EGG" },
  { key: "pancakes", label: "PANCAKES" },
  { key: "eggshell", label: "EGGSHELL" },
  { key: "paperboat", label: "PAPER BOAT" },
  { key: "umbrella", label: "UMBRELLA HAT" },
  { key: "fishbowl", label: "FISHBOWL" },
  { key: "cat", label: "SLEEPY CAT" },
  { key: "chick", label: "CHICK NEST" },
  { key: "bunnyhood", label: "BUNNY HOOD" },
  { key: "froghood", label: "FROG HOOD" },
  { key: "unicorn", label: "UNICORN HOOD" },
  { key: "flowers", label: "FLOWER CROWN" },
  { key: "halo", label: "HALO" },
  { key: "horns", label: "LITTLE HORNS" },
] as const;

export const MASKS = [
  { key: "none", label: "NONE" },
  { key: "masquerade", label: "MASQUERADE" },
  { key: "feather", label: "FEATHER MASK" },
  { key: "owl", label: "OWL MASK" },
  { key: "carnival", label: "CARNIVAL" },
  { key: "lion", label: "LION DANCE" },
  { key: "pumpkin", label: "PUMPKIN" },
  { key: "flower", label: "FLOWER FACE" },
  { key: "octopus", label: "OCTOPUS" },
  { key: "astronaut", label: "ASTRONAUT" },
  { key: "snorkel", label: "SNORKEL" },
  { key: "snowglobe", label: "SNOW GLOBE" },
  { key: "knight", label: "KNIGHT" },
  { key: "robot", label: "ROBOT" },
  { key: "tree", label: "XMAS TREE" },
  { key: "ninja", label: "NINJA WRAP" },
] as const;

export const EYEWEAR = [
  { key: "none", label: "NONE" },
  { key: "sleep", label: "PIG SLEEP MASK" },
  { key: "aviator", label: "PEACH AVIATORS" },
  { key: "alien", label: "ALIEN SPECS" },
  { key: "year", label: "PARTY 2026" },
  { key: "hearts", label: "HEART GLASSES" },
  { key: "round", label: "ROUND PINK" },
  { key: "shutter", label: "SHUTTER SHADES" },
  { key: "shades", label: "SUNGLASSES" },
  { key: "cateye", label: "CAT-EYE" },
  { key: "bold", label: "BOLD FRAMES" },
  { key: "nerd", label: "NERD GLASSES" },
  { key: "monocle", label: "MONOCLE" },
  { key: "ski", label: "SKI GOGGLES" },
  { key: "star", label: "STAR GLASSES" },
] as const;

export const ACCESSORIES = [
  { key: "none", label: "NONE" },
  { key: "bandage", label: "BANDAGE" },
  { key: "wings", label: "FAIRY WINGS" },
  { key: "angel", label: "ANGEL WINGS" },
  { key: "cupid", label: "CUPID ARROWS" },
  { key: "lollipop", label: "HEART LOLLIPOP" },
  { key: "earmuffs", label: "EARMUFFS + SCARF" },
  { key: "beltbag", label: "BELT BAG" },
  { key: "flamingo", label: "FLAMINGO FLOAT" },
  { key: "flag", label: "RAINBOW FLAG" },
  { key: "bell", label: "BELL COLLAR" },
  { key: "headband", label: "BOW HEADBAND" },
  { key: "balloon", label: "HEART BALLOON" },
  { key: "antlers", label: "ANTLERS" },
  { key: "bunny", label: "BUNNY EARS" },
  { key: "pinkbow", label: "PINK BOW" },
  { key: "bowtie", label: "BOW TIE" },
  { key: "facemask", label: "FACE MASK" },
  { key: "mustache", label: "MUSTACHE" },
  { key: "wand", label: "STAR WAND" },
  { key: "backpack", label: "BACKPACK" },
  { key: "headphones", label: "HEADPHONES" },
  { key: "pickaxe", label: "PICKAXE" },
  { key: "sword", label: "WOODEN SWORD" },
  { key: "skis", label: "SKIS" },
] as const;

export const OUTFITS = [
  { key: "none", label: "TEE + JEANS" },
  { key: "hoodie", label: "HOODIE" },
  { key: "puffer", label: "PUFFER" },
  { key: "overalls", label: "OVERALLS" },
  { key: "tuxedo", label: "TUXEDO" },
  { key: "sailor", label: "SAILOR" },
  { key: "stripes", label: "BERET STRIPES" },
  { key: "karate", label: "KARATE GI" },
  { key: "cheer", label: "CHEERLEADER" },
  { key: "jersey", label: "JERSEY #10" },
  { key: "jersey2", label: "STRIPED JERSEY" },
  { key: "sweater", label: "PINE SWEATER" },
  { key: "tang", label: "LUCKY RED JACKET" },
  { key: "santa", label: "SANTA SUIT" },
  { key: "chefcoat", label: "CHEF COAT" },
  { key: "labcoat", label: "LAB COAT" },
  { key: "astro", label: "SPACE SUIT" },
  { key: "hazmat", label: "HAZMAT" },
  { key: "wizard", label: "STAR ROBE" },
  { key: "vampire", label: "VAMPIRE CAPE" },
  { key: "skeleton", label: "SKELETON" },
  { key: "mummy", label: "MUMMY WRAP" },
  { key: "ghost", label: "GHOST SHEET" },
  { key: "dino", label: "DINO SUIT" },
  { key: "yeti", label: "YETI SUIT" },
  { key: "dalmatian", label: "DALMATIAN" },
  { key: "bee", label: "BUZZY BEE" },
  { key: "banana", label: "BANANA" },
  { key: "broccoli", label: "BROCCOLI" },
  { key: "popcorn", label: "POPCORN" },
  { key: "hotdog", label: "HOT DOG" },
  { key: "pencil", label: "PENCIL" },
  { key: "gingerbread", label: "GINGERBREAD" },
  { key: "angelsuit", label: "LITTLE ANGEL" },
  { key: "surfer", label: "SURFER" },
] as const;

type K<T extends readonly { key: string }[]> = T[number]["key"];
export interface HeroLook {
  skin: K<typeof SKINS>;
  hair: K<typeof HAIR_STYLES>;
  hairColor: K<typeof HAIR_COLORS>;
  /** Three characters: left eye, mouth, right eye — e.g. "^_^". */
  face: string;
  hat: K<typeof HATS>;
  mask: K<typeof MASKS>;
  eyewear: K<typeof EYEWEAR>;
  accessory: K<typeof ACCESSORIES>;
  outfit: K<typeof OUTFITS>;
}

export const DEFAULT_HEROES: Record<string, HeroLook> = {
  a: { skin: "s1", hair: "long", hairColor: "blonde", face: "^‿^", hat: "flowers", mask: "none", eyewear: "none", accessory: "pinkbow", outfit: "sailor" },
  b: { skin: "s3", hair: "spiky", hairColor: "brown", face: "•_•", hat: "cap", mask: "none", eyewear: "shades", accessory: "none", outfit: "puffer" },
  c: { skin: "s2", hair: "short", hairColor: "black", face: "o_o", hat: "none", mask: "none", eyewear: "nerd", accessory: "headphones", outfit: "hoodie" },
};

const has = <T extends readonly { key: string }[]>(list: T, k: unknown): k is K<T> =>
  typeof k === "string" && list.some((x) => x.key === k);

/** Split into user-visible characters (emoji and accents count as one). */
export function faceChars(face: string): string[] {
  const seg = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  return seg ? Array.from(seg.segment(face), (s) => s.segment) : Array.from(face);
}

/** A valid face is exactly 3 visible characters with no spaces. */
export function cleanFace(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const chars = faceChars(raw.normalize("NFC")).filter((c) => c.trim() !== "" && !/[\u0000-\u001f\u007f]/.test(c));
  return chars.length === 3 ? chars.join("") : null;
}

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
    face: cleanFace(r.face) ?? d.face,
    hat: has(HATS, r.hat) ? r.hat : d.hat,
    mask: has(MASKS, r.mask) ? r.mask : d.mask,
    eyewear: has(EYEWEAR, r.eyewear) ? r.eyewear : d.eyewear,
    accessory: has(ACCESSORIES, r.accessory) ? r.accessory : d.accessory,
    outfit: has(OUTFITS, r.outfit) ? r.outfit : d.outfit,
  };
}

export function randomHero(): HeroLook {
  const p = <T extends readonly { key: string }[]>(a: T) => a[Math.floor(Math.random() * a.length)].key as K<T>;
  const maybe = <T extends readonly { key: string }[]>(a: T, chance: number) => (Math.random() < chance ? p(a) : ("none" as K<T>));
  return {
    skin: p(SKINS),
    hair: p(HAIR_STYLES),
    hairColor: p(HAIR_COLORS),
    face: FACE_PRESETS[Math.floor(Math.random() * FACE_PRESETS.length)],
    hat: maybe(HATS, 0.6),
    mask: maybe(MASKS, 0.15),
    eyewear: maybe(EYEWEAR, 0.4),
    accessory: maybe(ACCESSORIES, 0.5),
    outfit: p(OUTFITS),
  };
}

// ------------------------------------------------------------------ drawing

/** Art is drawn on a 120-wide canvas (a chubby, big-headed hero); the view
 * starts at y = TOP so tall hats fit, and is H tall. Round avatars crop to the head. */
export const W = 120;
export const TOP = -24;
export const H = 164;
/** Where the raised hand is in the "swing" pose, in art units (of W × H). */
export const HAND = { x: 101, y: 72 };
/** The square around the head, for round avatars: [x, y, size]. */
export const HEAD_BOX: [number, number, number] = [6, -2, 108];

export const hexOf = <T extends readonly { key: string; hex: string }[]>(list: T, k: string) => list.find((x) => x.key === k)!.hex;

export function shade(h: string, f: number) {
  const n = parseInt(h.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${((1 << 24) | (c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).slice(1)}`;
}

/** A colour that reads on top of `bg`. */
export function glowOn(bg: string) {
  const n = parseInt(bg.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? "#10101E" : "#7DF9FF";
}
