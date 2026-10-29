/**
 * SPIDEY-CAM: turns any camera frame into red-and-blue pixel art.
 *
 * Pipeline (all on the phone, nothing leaves the device until you press SEND):
 *   source (live video or a still) → cropped to 3:4 and shrunk to a tiny grid
 *   → contrast boost → ordered (Bayer) dithering onto a red/blue palette
 *   → scaled up with hard pixel edges → optional pixel frame on top.
 */

import { ICONS, type Sprite } from "./pixels";

export type Rgb = [number, number, number];

export interface Palette {
  key: string;
  label: string;
  /** Dark → light. */
  colors: Rgb[];
}

const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export const PALETTES: Palette[] = [
  // Blue shadows, red mid-tones, pale highlights.
  { key: "spidey", label: "SPIDEY", colors: ["#060A24", "#132E8C", "#2F6BFF", "#D7263D", "#FF6B7A", "#FFF1F3"].map(hex) },
  // Red shadows, blue highlights.
  { key: "flip", label: "VERSE", colors: ["#1A0410", "#8E0F24", "#E2223B", "#1F4FE0", "#6FA8FF", "#EEF4FF"].map(hex) },
  // Just the two inks: hard red/blue comic print.
  { key: "comic", label: "INK", colors: ["#0B1240", "#1F4FE0", "#E2223B", "#FFF1F3"].map(hex) },
];

export const PIXEL_SIZES = [
  { key: "chunky", label: "CHUNKY", cols: 54 },
  { key: "mid", label: "PIXEL", cols: 84 },
  { key: "fine", label: "FINE", cols: 128 },
] as const;

export type FrameKey = "none" | "web" | "comic" | "signal" | "hearts";
export const FRAMES: { key: FrameKey; label: string }[] = [
  { key: "web", label: "WEB" },
  { key: "comic", label: "THWIP!" },
  { key: "signal", label: "REC" },
  { key: "hearts", label: "HEARTS" },
  { key: "none", label: "NO FRAME" },
];

/** Output aspect: 3:4 portrait. */
export const ASPECT = 4 / 3;

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Index into `palette` for a pixel (exported for tests). */
export function ditherIndex(r: number, g: number, b: number, x: number, y: number, levels: number, contrast = 1.35): number {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const boosted = Math.min(255, Math.max(0, (lum - 128) * contrast + 128));
  const threshold = (BAYER4[y & 3][x & 3] + 0.5) / 16 - 0.5;
  const v = (boosted / 255) * (levels - 1) + threshold * 0.9;
  return Math.min(levels - 1, Math.max(0, Math.round(v)));
}

/** Maps every pixel of `img` onto the palette, in place. */
export function pixelate(img: ImageData, palette: Palette): ImageData {
  const { data, width } = img;
  const n = palette.colors.length;
  for (let i = 0; i < data.length; i += 4) {
    const p = i >> 2;
    const x = p % width;
    const y = (p / width) | 0;
    const c = palette.colors[ditherIndex(data[i], data[i + 1], data[i + 2], x, y, n)];
    data[i] = c[0];
    data[i + 1] = c[1];
    data[i + 2] = c[2];
    data[i + 3] = 255;
  }
  return img;
}

export type Source = HTMLVideoElement | HTMLCanvasElement | HTMLImageElement | ImageBitmap;

function sourceSize(s: Source): [number, number] {
  if (s instanceof HTMLVideoElement) return [s.videoWidth, s.videoHeight];
  if (s instanceof HTMLImageElement) return [s.naturalWidth, s.naturalHeight];
  return [s.width, s.height];
}

/**
 * Draws `source` as red/blue pixel art onto `out` (whose size decides the
 * output resolution). `work` is a small scratch canvas reused between frames.
 */
export function renderSpideyCam(
  source: Source,
  out: HTMLCanvasElement,
  work: HTMLCanvasElement,
  opts: { cols: number; palette: Palette; mirror: boolean; frame: FrameKey; stamp?: string },
): boolean {
  const [sw, sh] = sourceSize(source);
  if (!sw || !sh) return false;
  const cols = opts.cols;
  const rows = Math.round(cols * ASPECT);
  if (work.width !== cols || work.height !== rows) {
    work.width = cols;
    work.height = rows;
  }
  const w = work.getContext("2d", { willReadFrequently: true });
  const o = out.getContext("2d");
  if (!w || !o) return false;

  // Centre-crop the source to 3:4.
  let cw = sw;
  let ch = sw * ASPECT;
  if (ch > sh) {
    ch = sh;
    cw = sh / ASPECT;
  }
  const cx = (sw - cw) / 2;
  const cy = (sh - ch) / 2;
  w.save();
  w.imageSmoothingEnabled = true;
  if (opts.mirror) {
    w.translate(cols, 0);
    w.scale(-1, 1);
  }
  w.drawImage(source as CanvasImageSource, cx, cy, cw, ch, 0, 0, cols, rows);
  w.restore();
  w.putImageData(pixelate(w.getImageData(0, 0, cols, rows), opts.palette), 0, 0);

  o.imageSmoothingEnabled = false;
  o.drawImage(work, 0, 0, out.width, out.height);
  drawFrame(o, out.width, out.height, opts.frame, opts.palette, opts.stamp);
  return true;
}

// ------------------------------------------------------------------ frames

function drawSprite(ctx: CanvasRenderingContext2D, sprite: Sprite, x: number, y: number, cell: number) {
  sprite.grid.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const color = sprite.palette[row[c]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x + c * cell), Math.round(y + r * cell), Math.ceil(cell), Math.ceil(cell));
    }
  });
}

function displayFont(): string {
  if (typeof document === "undefined") return "monospace";
  return getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "monospace";
}

function pixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill: string, stroke: string, align: CanvasTextAlign = "left") {
  ctx.font = `700 ${Math.round(size)}px ${displayFont()}`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = Math.max(2, size / 5);
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** A stepped (pixel) quarter web in one corner. */
function cornerWeb(ctx: CanvasRenderingContext2D, ox: number, oy: number, dx: number, dy: number, r: number, cell: number, color: string) {
  ctx.fillStyle = color;
  const dot = (x: number, y: number) => ctx.fillRect(Math.round(ox + dx * x - cell / 2), Math.round(oy + dy * y - cell / 2), cell, cell);
  // spokes
  for (let k = 0; k <= 4; k++) {
    const a = (k / 4) * (Math.PI / 2);
    for (let t = 0; t <= r; t += cell) dot(Math.cos(a) * t, Math.sin(a) * t);
  }
  // sagging rings
  for (let ring = 1; ring <= 3; ring++) {
    const rr = (r * ring) / 3.3;
    for (let a = 0; a <= Math.PI / 2; a += cell / rr) {
      const sag = 1 - 0.12 * Math.sin(((a % (Math.PI / 8)) / (Math.PI / 8)) * Math.PI);
      dot(Math.cos(a) * rr * sag, Math.sin(a) * rr * sag);
    }
  }
}

function border(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, t);
  ctx.fillRect(0, h - t, w, t);
  ctx.fillRect(0, 0, t, h);
  ctx.fillRect(w - t, 0, t, h);
}

export function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number, frame: FrameKey, palette: Palette, stamp?: string) {
  const u = w / 90; // one "frame pixel"
  const light = "#FFF1F3";
  const ink = "#060A24";
  const red = "#E2223B";
  const blue = "#1F4FE0";
  switch (frame) {
    case "none":
      return;
    case "web": {
      border(ctx, w, h, u * 2, ink);
      cornerWeb(ctx, u * 2, u * 2, 1, 1, w * 0.3, u, light);
      cornerWeb(ctx, w - u * 2, h - u * 2, -1, -1, w * 0.3, u, light);
      // dangling spider
      ctx.fillStyle = light;
      ctx.fillRect(w * 0.82, 0, u * 0.8, h * 0.12);
      drawSprite(ctx, { ...ICONS.spider, palette: { ...ICONS.spider.palette, v: red, k: ink } }, w * 0.82 - u * 4.5, h * 0.12, u);
      return;
    }
    case "comic": {
      border(ctx, w, h, u * 3, ink);
      // halftone strip at the bottom
      for (let y = h - u * 16; y < h - u * 3; y += u * 2.4) {
        for (let x = u * 3; x < w - u * 3; x += u * 2.4) {
          const k = (y - (h - u * 16)) / (u * 13);
          ctx.fillStyle = red;
          ctx.fillRect(x, y, u * (0.5 + k), u * (0.5 + k));
        }
      }
      // burst + caption
      const bx = w * 0.27;
      const by = h * 0.86;
      ctx.fillStyle = "#FFC93C";
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const rr = i % 2 ? u * 9 : u * 15;
        ctx.fillRect(bx + Math.cos(a) * rr - u * 2, by + Math.sin(a) * rr * 0.7 - u * 2, u * 4, u * 4);
      }
      ctx.beginPath();
      ctx.ellipse(bx, by, u * 13, u * 9, 0, 0, Math.PI * 2);
      ctx.fill();
      pixelText(ctx, "THWIP!", bx, by + u * 2.5, u * 7, red, ink, "center");
      return;
    }
    case "signal": {
      const t = u * 1;
      // corner brackets
      ctx.fillStyle = light;
      const L = u * 12;
      const m = u * 4;
      for (const [x, y, sx, sy] of [
        [m, m, 1, 1],
        [w - m, m, -1, 1],
        [m, h - m, 1, -1],
        [w - m, h - m, -1, -1],
      ] as const) {
        ctx.fillRect(Math.min(x, x + sx * L), y - (sy < 0 ? t : 0), L, t);
        ctx.fillRect(x - (sx < 0 ? t : 0), Math.min(y, y + sy * L), t, L);
      }
      // REC + stamp
      ctx.fillStyle = red;
      ctx.fillRect(m + u * 3, m + u * 3, u * 3.5, u * 3.5);
      pixelText(ctx, "REC", m + u * 8, m + u * 6.4, u * 4.6, light, ink);
      pixelText(ctx, "WEB//SIGNAL", w - m - u * 3, h - m - u * 3, u * 4.2, light, ink, "right");
      if (stamp) pixelText(ctx, stamp, m + u * 3, h - m - u * 3, u * 4.2, light, ink);
      // scanlines
      ctx.fillStyle = "rgba(6,10,36,0.18)";
      for (let y = 0; y < h; y += u * 1.5) ctx.fillRect(0, y, w, u * 0.5);
      return;
    }
    case "hearts": {
      border(ctx, w, h, u * 7, palette.colors[1] ? `rgb(${palette.colors[1].join(",")})` : blue);
      const cell = u * 0.62;
      const step = u * 7;
      for (let x = 0; x < w; x += step) {
        drawSprite(ctx, ICONS.heart, x + u * 0.4, u * 1, cell);
        drawSprite(ctx, ICONS.heart, x + u * 0.4, h - u * 6.5, cell);
      }
      for (let y = step; y < h - step; y += step) {
        drawSprite(ctx, ICONS.heart, u * 0.6, y, cell);
        drawSprite(ctx, ICONS.heart, w - u * 6.4, y, cell);
      }
      return;
    }
  }
}
