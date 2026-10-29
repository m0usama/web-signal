/**
 * Tiny original pixel sprites, defined as character grids.
 * Each character maps to a colour in the sprite's palette ('.' = transparent).
 *
 * The two avatar sprites are PLACEHOLDERS. Drop your own pixel art into
 * /public/avatars/a.png and /public/avatars/b.png and the app uses those instead.
 */

export interface Sprite {
  grid: string[];
  palette: Record<string, string>;
}

const INK = "#10101E";

export const AVATAR_A: Sprite = {
  palette: {
    k: INK,
    w: "#F8F5FF",
    s: "#D8D0F2",
    p: "#6126CF",
    v: "#A75CFF",
    g: "#E9E6F5",
    y: "#FFC93C",
  },
  grid: [
    "......kkkk......",
    "....kkwwwwkk....",
    "...kwwwwwwwwk...",
    "..kwwwwwwwwwwk..",
    "..kwpkkkkkkpwk..",
    ".kwpkssssssskpk.",
    ".kwpgggksgggkpk.",
    ".kwpgvvgkgvvgpk.",
    ".kwpgvsgggsvgpk.",
    ".kwpkgggsgggkpk.",
    ".kwwpksswssspwk.",
    "..kwwpkkykkpwk..",
    "..kwwwwwwwwwwk..",
    ".kvkwwwppwwwkvk.",
    ".kvkwwwppwwwkvk.",
    "..kkwwwwwwwwkk..",
    "...kwwk..kwwk...",
    "...kkk....kkk...",
  ],
};

export const AVATAR_B: Sprite = {
  palette: {
    k: INK,
    c: "#2E2E45",
    d: "#1B1B2C",
    a: "#FFB347",
    w: "#F8F5FF",
    r: "#FF705C",
    o: "#C2502F",
  },
  grid: [
    "......kkkk......",
    "....kkccddkk....",
    "...kccccccddk...",
    "..kccccccccddk..",
    "..kcaaaaaaaadk..",
    ".kccawwaawwacdk.",
    ".kccawwaawwacdk.",
    ".kccaaaaaaaacdk.",
    "..kccccccccdk...",
    "..kcccccccccdk..",
    "..krrrrrrrroook.",
    "..krrrrrrrrrok..",
    ".kcckccccccdkok.",
    ".kcckccaacdk.k..",
    "..kkcccccccdk...",
    "...kcccccccdk...",
    "...kccdk.kcdk...",
    "...kkkk..kkkk...",
  ],
};

export const LOGO: Sprite = {
  palette: { k: INK, w: "#F8F5FF", v: "#A75CFF", p: "#FF65AD" },
  grid: [
    "k.....kk.....k",
    ".k...kvvk...k.",
    "..k..kvvk..k..",
    "kk.kkwvvwkk.kk",
    "...kwvppvwk...",
    "kkkkwvppvwkkkk",
    "...kwvvvvwk...",
    "..k.kwvvwk.k..",
    ".k...kwwk...k.",
    "k.....kk.....k",
  ],
};

const HEART = ["..kk.kk..", ".kppkppk.", "kppwpppk", "kpppppppk", ".kpppppk.", "..kpppk..", "...kpk...", "....k...."];

export const ICONS: Record<string, Sprite> = {
  heart: { palette: { k: INK, p: "#FF65AD", w: "#FFD3E8" }, grid: HEART.map((r) => r.padEnd(9, ".")) },
  fingerheart: {
    palette: { k: INK, p: "#FF65AD", s: "#FFD1B8", w: "#FFD3E8" },
    grid: [".kk.kk....", "kppkppk...", "kpwpppk...", ".kpppk....", "..kpk.....", "...k.kk...", "....kssk..", "...ksssk..", "...kssssk.", "....kkkk.."],
  },
  spider: {
    palette: { k: INK, v: "#A75CFF", w: "#F8F5FF" },
    grid: ["k..k..k..k", ".k.k..k.k.", "..kvvvvk..", "kkvwvvwvkk", "..kvvvvk..", "kkkvvvvkkk", "..kvvvvk..", ".k.kvvk.k.", "k...kk...k"],
  },
  zap: {
    palette: { k: INK, y: "#FFC93C", w: "#FFF4C2" },
    grid: ["....kkkk", "...kyyk.", "..kyyk..", ".kywyykk", "kkkkyyk.", "..kyyk..", ".kyyk...", ".kyk....", ".kk....."],
  },
  star: {
    palette: { k: INK, y: "#FFB347", w: "#FFF1C9" },
    grid: ["....k....", "...kyk...", "kkkkwykkk", "kyyyyyyyk", ".kyyyyyk.", "..kyyyk..", ".kyykyyk.", ".kyk.kyk.", ".kk...kk."],
  },
  hug: {
    palette: { k: INK, o: "#FF705C", s: "#FFD1B8", w: "#F8F5FF" },
    grid: ["..kkkkk..", ".ksssssk.", "ksksssksk", "ksssssssk", "kskkkkksk", ".ksskssk.", "kokkkkkok", "kook.kook", ".kk...kk."],
  },
  web: {
    palette: { k: INK, w: "#F8F5FF", b: "#9CD9FF" },
    grid: ["w...w...w", ".w..w..w.", "..wbwbw..", ".wbw.wbw.", "wwww.wwww", ".wbw.wbw.", "..wbwbw..", ".w..w..w.", "w...w...w"],
  },
  camera: {
    palette: { k: INK, o: "#FFB347", w: "#F8F5FF", b: "#169FE8" },
    grid: ["...kkk....", "kkkoookkk.", "koooooook.", "kookkkook.", "kokbwbkok.", "kokbbbkok.", "kookkkook.", "koooooook.", "kkkkkkkkk."],
  },
  ghost: {
    palette: { k: INK, w: "#F8F5FF", v: "#A75CFF" },
    grid: ["..kkkkk..", ".kwwwwwk.", "kwwwwwwwk", "kwvwwwvwk", "kwvwwwvwk", "kwwwwwwwk", "kwwwwwwwk", "kwkwkwkwk", ".k.k.k.k."],
  },
  moon: {
    palette: { k: INK, y: "#FFE59A" },
    grid: ["..kkkk..", ".kyyk...", "kyyk....", "kyyk....", "kyyk....", "kyyyk..k", ".kyyykkk", "..kkkkk."],
  },
  coffee: {
    palette: { k: INK, w: "#F8F5FF", b: "#7A4A2B", s: "#C9C9D9" },
    grid: [".s.s.s...", "..s.s....", "kkkkkkk..", "kwbbbwkkk", "kwwwwwk.k", "kwwwwwkkk", "kwwwwwk..", ".kkkkk...", "kkkkkkkk."],
  },
  cat: {
    palette: { k: INK, o: "#FFB347", w: "#F8F5FF", p: "#FF65AD" },
    grid: ["k.....k..", "kok.kok..", "kooookk..", "kokookok.", "koooooook", "kowpwoook", ".kooooook", "..kokkok.", "..kk..kk."],
  },
  pizza: {
    palette: { k: INK, y: "#FFC93C", r: "#FF705C", o: "#D98A3A" },
    grid: ["kkkkkkkkk", "koooooook", ".kyyryyk.", ".kyyyyyk.", "..kryyk..", "..kyyrk..", "...kyk...", "...kyk...", "....k...."],
  },
  sparkle: {
    palette: { k: INK, w: "#F8F5FF", v: "#A75CFF" },
    grid: ["....k....", "...kvk...", "...kvk...", "kkkvwvkkk", "kvvwwwvvk", "kkkvwvkkk", "...kvk...", "...kvk...", "....k...."],
  },
  flower: {
    palette: { k: INK, p: "#FF65AD", y: "#FFC93C", g: "#3FBF7F" },
    grid: ["..kkk....", ".kpppk...", "kppyppk..", "kpyyypk..", "kppyppk..", ".kpppk...", "..kgk.kk.", "..kgkkgk.", "..kgggk.."],
  },
  pigeon: {
    palette: { k: INK, s: "#B9B7CC", w: "#F8F5FF", o: "#FFB347" },
    grid: ["..kkk....", ".kswk....", "oksssk...", ".ksssskk.", ".kssssssk", "..kssssk.", "...kokk..", "...k.k..."],
  },
  tower: {
    palette: { k: INK, b: "#7A4A2B", d: "#4E2F1C" },
    grid: [".kkk.", "kbbbk", "kbdbk", "kbbbk", "k.k.k", "k.k.k"],
  },
};

/** Sticker keys available in the composer (all original pixel art). */
export const STICKERS = ["heart", "star", "zap", "moon", "coffee", "cat", "pizza", "sparkle", "flower", "ghost", "pigeon", "spider"] as const;

export const POKES = [
  { kind: "heart", label: "HEART", shout: "HEY YOU!" },
  { kind: "fingerheart", label: "FINGER HEART", shout: "MISS YOU!" },
  { kind: "hug", label: "HUG", shout: "SQUEEZE!" },
  { kind: "zap", label: "ZAP", shout: "ZZZAP!" },
  { kind: "star", label: "STAR", shout: "YOU'RE A STAR!" },
  { kind: "spider", label: "TINGLE", shout: "INCOMING SIGNAL!" },
  { kind: "web", label: "WEB SHOT", shout: "GOTCHA!" },
] as const;

export const BADGES: Record<string, { title: string; hint: string; icon: string }> = {
  first_signal: { title: "FIRST SIGNAL", hint: "Send your first message", icon: "sparkle" },
  first_poke: { title: "POKE PIONEER", hint: "Send a poke", icon: "zap" },
  first_drop: { title: "ROOFTOP DROP", hint: "Leave a signal drop on the map", icon: "star" },
  finder: { title: "FINDER", hint: "Open a signal drop", icon: "moon" },
  ghost_writer: { title: "GHOST WRITER", hint: "Send a ghost signal", icon: "ghost" },
  heart_sync: { title: "HEART SYNC", hint: "Send hearts within 10 seconds of each other", icon: "heart" },
  night_owl: { title: "NIGHT OWL", hint: "Send a signal after midnight", icon: "moon" },
  chatterbox: { title: "CHATTERBOX", hint: "Send 100 signals", icon: "coffee" },
  rooftop_champ: { title: "ROOFTOP CHAMP", hint: "Win a game of rooftop tic-tac-toe", icon: "star" },
};
