/**
 * The build-your-own pixel spider (an original, eight-legged mascot).
 * A look is two colours + eyes + a pattern + an extra, turned into a
 * 33x33 pixel grid that every screen draws the same way.
 */

export const SPIDER_COLORS = [
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
  { key: "black", hex: "#22223A", label: "BLACK" },
  { key: "teal", hex: "#14B8C4", label: "TEAL" },
] as const;

export const SPIDER_EYES = [
  { key: "big", label: "BIG EYES" },
  { key: "happy", label: "HAPPY" },
  { key: "wink", label: "WINK" },
  { key: "sleepy", label: "SLEEPY" },
  { key: "hearts", label: "IN LOVE" },
  { key: "stars", label: "STARRY" },
  { key: "fierce", label: "FIERCE" },
  { key: "shades", label: "COOL" },
] as const;

export const SPIDER_PATTERNS = [
  { key: "plain", label: "PLAIN" },
  { key: "split", label: "DUO SPLIT" },
  { key: "belly", label: "BELLY" },
  { key: "stripes", label: "STRIPES" },
  { key: "spots", label: "SPOTS" },
  { key: "web", label: "WEB" },
  { key: "heart", label: "HEART" },
  { key: "star", label: "STAR" },
  { key: "zigzag", label: "ZIGZAG" },
] as const;

export const SPIDER_EXTRAS = [
  { key: "none", label: "NONE" },
  { key: "bow", label: "BOW" },
  { key: "cap", label: "CAP" },
  { key: "crown", label: "CROWN" },
  { key: "headphones", label: "HEADPHONES" },
  { key: "flower", label: "FLOWER" },
] as const;

type Key<T extends readonly { key: string }[]> = T[number]["key"];
export type SpiderColor = Key<typeof SPIDER_COLORS>;
export type SpiderEyes = Key<typeof SPIDER_EYES>;
export type SpiderPattern = Key<typeof SPIDER_PATTERNS>;
export type SpiderExtra = Key<typeof SPIDER_EXTRAS>;

export interface SpiderLook {
  body: SpiderColor;
  accent: SpiderColor;
  eyes: SpiderEyes;
  pattern: SpiderPattern;
  extra: SpiderExtra;
}

export const DEFAULT_LOOKS: Record<string, SpiderLook> = {
  a: { body: "violet", accent: "white", eyes: "big", pattern: "web", extra: "bow" },
  b: { body: "red", accent: "blue", eyes: "fierce", pattern: "split", extra: "none" },
  c: { body: "teal", accent: "black", eyes: "shades", pattern: "stripes", extra: "headphones" },
};

const has = <T extends readonly { key: string }[]>(list: T, k: unknown): k is Key<T> =>
  typeof k === "string" && list.some((x) => x.key === k);

/** Accepts anything (e.g. JSON from the database) and returns a valid look. */
export function normaliseLook(raw: unknown, avatarKey = "b"): SpiderLook {
  const d = DEFAULT_LOOKS[avatarKey] ?? DEFAULT_LOOKS.b;
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    body: has(SPIDER_COLORS, r.body) ? r.body : d.body,
    accent: has(SPIDER_COLORS, r.accent) ? r.accent : d.accent,
    eyes: has(SPIDER_EYES, r.eyes) ? r.eyes : d.eyes,
    pattern: has(SPIDER_PATTERNS, r.pattern) ? r.pattern : d.pattern,
    extra: has(SPIDER_EXTRAS, r.extra) ? r.extra : d.extra,
  };
}

export function randomLook(): SpiderLook {
  const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
  const body = pick(SPIDER_COLORS).key;
  let accent = pick(SPIDER_COLORS).key;
  if (accent === body) accent = body === "white" ? "red" : "white";
  return { body, accent, eyes: pick(SPIDER_EYES).key, pattern: pick(SPIDER_PATTERNS).key, extra: pick(SPIDER_EXTRAS).key };
}

// ------------------------------------------------------------------ pixel grid

export const GRID = 33;
const CX = 16;
const CY = 18;
const R = 9;

/** Palette characters used in the grid. */
export interface SpiderGrid {
  cells: string[][]; // GRID x GRID, "" = transparent
}

function hex(c: SpiderColor) {
  return SPIDER_COLORS.find((x) => x.key === c)!.hex;
}

/** Slightly darker shade for outlines of light colours / leg joints. */
function shade(h: string, f = 0.7) {
  const n = parseInt(h.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const INK = "#10101E";
const WHITE = "#F8F5FF";
const PINK = "#FF5C8A";
const YELLOW = "#FFD84D";

function line(set: (x: number, y: number) => void, x0: number, y0: number, x1: number, y1: number) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    set(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

const HEART = [".x.x.", "xxxxx", "xxxxx", ".xxx.", "..x.."];
const STAR = ["..x..", ".xxx.", "xxxxx", ".x.x.", "x...x"];

/** Builds the colour grid for a look. `blink` closes the eyes (for animation). */
export function spiderPixels(look: SpiderLook, opts: { thread?: boolean; blink?: boolean } = {}): string[][] {
  const g: string[][] = Array.from({ length: GRID }, () => Array<string>(GRID).fill(""));
  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && y >= 0 && x < GRID && y < GRID) g[y][x] = c;
  };
  const body = hex(look.body);
  const accent = hex(look.accent);
  // Legs: a darker shade of the body (dark bodies get a lighter leg so they show at night).
  const leg = look.body === "black" || look.body === "blue" ? shade(accent, 0.85) : shade(body, 0.62);
  const inBody = (x: number, y: number) => Math.hypot(x - CX, y - CY) <= R - 0.6;

  // thread
  if (opts.thread !== false) for (let y = 0; y < CY - R + 1; y++) set(CX, y, WHITE);

  // legs (right side, mirrored), drawn first so the body sits on top
  const legs: [number, number][][] = [
    [[23, 13], [27, 8], [30, 9]],
    [[24, 16], [29, 13], [32, 15]],
    [[24, 20], [29, 21], [31, 25]],
    [[23, 23], [27, 27], [28, 32]],
  ];
  for (const pts of legs)
    for (const side of [1, -1]) {
      const p = pts.map(([x, y]) => [side === 1 ? x : 2 * CX - x, y] as [number, number]);
      for (let i = 0; i < p.length - 1; i++) line((x, y) => set(x, y, leg), p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]);
      set(p[1][0], p[1][1], accent); // knee
      set(p[p.length - 1][0], p[p.length - 1][1], accent); // foot
    }

  // body with outline
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const d = Math.hypot(x - CX, y - CY);
      if (d <= R - 0.6) set(x, y, body);
      else if (d <= R + 0.45) set(x, y, INK);
    }

  // pattern (accent colour, inside the body only)
  const paint = (x: number, y: number) => inBody(x, y) && set(x, y, accent);
  const stamp = (bmp: string[], ox: number, oy: number) =>
    bmp.forEach((row, j) => [...row].forEach((ch, i) => ch === "x" && paint(ox + i, oy + j)));
  for (let y = CY - R; y <= CY + R; y++)
    for (let x = CX - R; x <= CX + R; x++) {
      const dx = x - CX;
      const dy = y - CY;
      switch (look.pattern) {
        case "split":
          if (x > CX) paint(x, y);
          break;
        case "belly":
          if (dy >= 4) paint(x, y);
          break;
        case "stripes":
          if (dy >= 3 && dy % 3 === 0) paint(x, y);
          break;
        case "zigzag":
          if (dy === 5 + (((x % 4) + 4) % 4 < 2 ? 0 : 1) || dy === 6 + (((x % 4) + 4) % 4 < 2 ? 0 : 1)) paint(x, y);
          break;
        case "web": {
          const r = Math.hypot(dx, dy);
          if (dy >= 2 && (dx === 0 || Math.abs(dx) === dy - 2 || Math.round(r) === 6 || Math.round(r) === 9 - 1)) paint(x, y);
          break;
        }
      }
    }
  if (look.pattern === "spots") for (const [x, y] of [[11, 21], [20, 22], [15, 25], [22, 18], [9, 17], [18, 19]]) {
    paint(x, y);
    paint(x + 1, y);
    paint(x, y + 1);
    paint(x + 1, y + 1);
  }
  if (look.pattern === "heart") stamp(HEART, CX - 2, CY + 3);
  if (look.pattern === "star") stamp(STAR, CX - 2, CY + 3);

  // a little shine
  set(CX - 5, CY - 6, shade(WHITE, 1));
  set(CX - 6, CY - 5, shade(WHITE, 1));

  // face
  const ey = CY - 2;
  const L = CX - 4;
  const Rx = CX + 2;
  const eye = (x0: number, kind: string) => {
    if (opts.blink && kind !== "shades") {
      for (let i = 0; i < 3; i++) set(x0 + i, ey + 1, INK);
      return;
    }
    switch (kind) {
      case "big":
      case "fierce":
        for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) set(x0 + i, ey + j, WHITE);
        set(x0 + 1, ey + 1, INK);
        set(x0 + 1, ey + 2, INK);
        if (kind === "fierce") {
          // slanted brow
          const inner = x0 < CX ? x0 + 2 : x0;
          const outer = x0 < CX ? x0 : x0 + 2;
          set(outer, ey - 1, INK);
          set(x0 + 1, ey - 1, INK);
          set(inner, ey, INK);
        }
        break;
      case "happy":
        set(x0, ey + 1, INK);
        set(x0 + 1, ey, INK);
        set(x0 + 2, ey + 1, INK);
        break;
      case "sleepy":
        for (let i = 0; i < 3; i++) set(x0 + i, ey + 1, INK);
        set(x0 + 2, ey + 2, INK);
        break;
      case "hearts":
        set(x0, ey, PINK);
        set(x0 + 2, ey, PINK);
        for (let i = 0; i < 3; i++) set(x0 + i, ey + 1, PINK);
        set(x0 + 1, ey + 2, PINK);
        break;
      case "stars":
        set(x0 + 1, ey, YELLOW);
        for (let i = 0; i < 3; i++) set(x0 + i, ey + 1, YELLOW);
        set(x0 + 1, ey + 2, YELLOW);
        break;
    }
  };
  if (look.eyes === "wink") {
    eye(L, "big");
    eye(Rx, "happy");
  } else if (look.eyes === "shades") {
    for (let i = L - 1; i <= Rx + 3; i++) set(i, ey, INK);
    for (let j = 1; j < 3; j++) {
      for (let i = 0; i < 4; i++) set(L - 1 + i, ey + j, INK);
      for (let i = 0; i < 4; i++) set(Rx + i, ey + j, INK);
    }
    set(L, ey + 1, WHITE);
    set(Rx + 1, ey + 1, WHITE);
  } else {
    eye(L, look.eyes);
    eye(Rx, look.eyes);
  }
  // smile + cheeks
  set(CX - 1, ey + 5, INK);
  set(CX, ey + 5, INK);
  set(CX + 1, ey + 5, INK);
  set(CX - 2, ey + 4, INK);
  set(CX + 2, ey + 4, INK);
  if (look.eyes !== "fierce" && look.eyes !== "shades") {
    set(CX - 6, ey + 3, PINK);
    set(CX + 6, ey + 3, PINK);
  }

  // extras (drawn on top)
  const top = CY - R;
  switch (look.extra) {
    case "bow": {
      const c = PINK;
      for (const [x, y] of [[9, 9], [10, 9], [9, 10], [10, 10], [11, 10], [12, 11], [13, 10], [14, 9], [13, 9], [14, 10], [9, 11], [14, 11]]) set(x, y, c);
      set(12, 10, shade(c));
      break;
    }
    case "cap":
      for (let x = CX - 6; x <= CX + 6; x++) for (let y = top - 1; y <= top + 2; y++) if (Math.hypot(x - CX, y - CY) <= R + 0.5) set(x, y, accent);
      for (let x = CX - 6; x <= CX + 6; x++) if (Math.hypot(x - CX, top + 3 - CY) <= R + 0.5) set(x, top + 3, INK);
      for (let x = CX + 3; x <= CX + 9; x++) set(x, top + 3, accent);
      set(CX, top - 1, WHITE);
      break;
    case "crown":
      for (let x = CX - 4; x <= CX + 4; x++) {
        set(x, top - 1, YELLOW);
        set(x, top, YELLOW);
      }
      for (const x of [CX - 4, CX, CX + 4]) {
        set(x, top - 2, YELLOW);
        set(x, top - 3, YELLOW);
      }
      set(CX, top - 1, PINK);
      break;
    case "headphones":
      for (let a = Math.PI * 1.08; a <= Math.PI * 1.92; a += 0.05) set(Math.round(CX + Math.cos(a) * (R + 1)), Math.round(CY + Math.sin(a) * (R + 1)), INK);
      for (const sx of [CX - R - 1, CX + R - 1])
        for (let j = 0; j < 4; j++)
          for (let i = 0; i < 3; i++) set(sx + i, CY - 4 + j, i === 1 ? accent : INK);
      break;
    case "flower": {
      const fx = CX + 6;
      const fy = top + 2;
      for (const [x, y] of [[fx, fy - 1], [fx - 1, fy], [fx + 1, fy], [fx, fy + 1]]) set(x, y, WHITE);
      set(fx, fy, YELLOW);
      break;
    }
  }
  return g;
}

/** Horizontal runs of the same colour, for compact SVG output. */
export function spiderRuns(look: SpiderLook, opts: { thread?: boolean; blink?: boolean } = {}) {
  const g = spiderPixels(look, opts);
  const runs: { x: number; y: number; w: number; c: string }[] = [];
  for (let y = 0; y < GRID; y++) {
    let x = 0;
    while (x < GRID) {
      const c = g[y][x];
      if (!c) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < GRID && g[y][x + w] === c) w++;
      runs.push({ x, y, w, c });
      x += w;
    }
  }
  return runs;
}
