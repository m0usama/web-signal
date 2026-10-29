/**
 * Procedural, fictional island city. Deterministic (fixed seed) so both
 * people always see exactly the same streets, rooftops and bridges.
 * Coordinates are in "map units"; positions stored in the database are
 * normalised 0..1 of CITY_W / CITY_H.
 */

export const CITY_W = 800;
export const CITY_H = 1200;
const SEED = 0x5157_4e41; // "SIGNA"

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Building extends Rect {
  id: string;
  level: 1 | 2 | 3 | 4;
  windows: [number, number][];
  waterTower: boolean;
  antenna: boolean;
  /** Approximate centre, handy for drops and taps. */
  cx: number;
  cy: number;
}

export interface Bridge extends Rect {
  id: string;
}

export interface CarLane {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  duration: number;
  delay: number;
  color: string;
}

export interface City {
  width: number;
  height: number;
  /** Stepped coastline as [y, left, right] rows (8-unit pixel steps). */
  rows: [number, number, number][];
  mainlandLeft: number;
  mainlandRight: number;
  avenues: number[];
  streets: number[];
  park: Rect;
  pond: Rect;
  buildings: Building[];
  bridges: Bridge[];
  lanes: CarLane[];
  stars: [number, number][];
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const snap = (v: number, step = 8) => Math.round(v / step) * step;

export function generateCity(): City {
  const rnd = mulberry32(SEED);
  const rint = (min: number, max: number) => Math.floor(min + rnd() * (max - min + 1));

  // --- Coastline: the island tapers to a point in the south, like a certain famous one.
  const rows: [number, number, number][] = [];
  const top = 40;
  const bottom = 1136;
  for (let y = top; y < bottom; y += 16) {
    const t = (y - top) / (bottom - top);
    const taper = t > 0.78 ? (t - 0.78) / 0.22 : 0;
    const wobbleL = Math.sin(y / 70) * 10 + (rnd() - 0.5) * 8;
    const wobbleR = Math.cos(y / 90) * 12 + (rnd() - 0.5) * 8;
    const left = snap(150 + wobbleL + taper * 150);
    const right = snap(640 + wobbleR - taper * 190 - t * 30);
    rows.push([y, left, Math.max(left + 32, right)]);
  }

  const islandBounds = (y: number) => {
    const row = rows.find(([ry]) => y >= ry && y < ry + 16);
    return row ? { left: row[1], right: row[2] } : null;
  };
  const insideIsland = (r: Rect, pad = 6) => {
    for (let yy = r.y; yy <= r.y + r.h; yy += 8) {
      const b = islandBounds(yy);
      if (!b || r.x < b.left + pad || r.x + r.w > b.right - pad) return false;
    }
    return true;
  };

  // --- Street grid
  const avenues = [176, 272, 368, 464, 560];
  const streets: number[] = [];
  for (let y = 72; y < bottom; y += 48) streets.push(y);

  const park: Rect = { x: 280, y: 360, w: 176, h: 232 };
  const pond: Rect = { x: 336, y: 424, w: 64, h: 40 };

  // --- Buildings in every block
  const buildings: Building[] = [];
  const colEdges = [140, ...avenues, 680];
  let n = 0;
  for (let si = 0; si < streets.length - 1; si++) {
    const by = streets[si] + 8;
    const bh = streets[si + 1] - streets[si] - 16;
    for (let ai = 0; ai < colEdges.length - 1; ai++) {
      const bx = colEdges[ai] + 8;
      const bw = colEdges[ai + 1] - colEdges[ai] - 16;
      const block: Rect = { x: bx, y: by, w: bw, h: bh };
      const overlapsPark =
        block.x < park.x + park.w && block.x + block.w > park.x && block.y < park.y + park.h && block.y + block.h > park.y;
      if (overlapsPark) continue;

      // Split each block into 1–3 lots.
      const lots = rint(1, 3);
      let cursor = block.x;
      for (let li = 0; li < lots; li++) {
        const remaining = block.x + block.w - cursor;
        const w = li === lots - 1 ? remaining : snap(remaining / (lots - li) + (rnd() - 0.5) * 16);
        const lot: Rect = { x: cursor, y: block.y, w: Math.max(16, w - 4), h: block.h };
        cursor += w;
        if (lot.w < 16 || !insideIsland(lot)) continue;

        const level = (1 + Math.floor(rnd() * 4)) as Building["level"];
        const windows: [number, number][] = [];
        for (let wy = lot.y + 4; wy < lot.y + lot.h - 6; wy += 8) {
          for (let wx = lot.x + 4; wx < lot.x + lot.w - 6; wx += 8) {
            if (rnd() < 0.18) windows.push([wx, wy]);
          }
        }
        buildings.push({
          ...lot,
          id: `b${n++}`,
          level,
          windows,
          waterTower: level >= 2 && rnd() < 0.22,
          antenna: level === 4 && rnd() < 0.35,
          cx: lot.x + lot.w / 2,
          cy: lot.y + lot.h / 2,
        });
      }
    }
  }

  // --- Bridges (left river and right river)
  const bridges: Bridge[] = [];
  const bridgeRows = [200, 520, 760, 940];
  bridgeRows.forEach((y, i) => {
    const b = islandBounds(y);
    if (!b) return;
    if (i % 2 === 0 || i === 3) bridges.push({ id: `L${i}`, x: 56, y, w: b.left - 56, h: 16 });
    if (i !== 3) bridges.push({ id: `R${i}`, x: b.right, y: y + 24, w: CITY_W - 56 - b.right, h: 16 });
  });

  // --- Animated traffic lanes along avenues and across bridges
  const palette = ["#FFB347", "#FF705C", "#F8F5FF", "#FF65AD", "#169FE8"];
  const lanes: CarLane[] = [];
  avenues.forEach((x, i) => {
    const start = rows.find(([, l, r]) => x > l + 8 && x < r - 8);
    const end = [...rows].reverse().find(([, l, r]) => x > l + 8 && x < r - 8);
    if (!start || !end) return;
    const down = i % 2 === 0;
    lanes.push({
      id: `ave${i}`,
      x1: x + (down ? -3 : 3),
      y1: down ? start[0] + 8 : end[0],
      x2: x + (down ? -3 : 3),
      y2: down ? end[0] : start[0] + 8,
      duration: 14 + rint(0, 10),
      delay: -rint(0, 20),
      color: palette[i % palette.length],
    });
  });
  bridges.forEach((b, i) => {
    lanes.push({
      id: `br${b.id}`,
      x1: i % 2 ? b.x + b.w : b.x,
      y1: b.y + 8,
      x2: i % 2 ? b.x : b.x + b.w,
      y2: b.y + 8,
      duration: 6 + rint(0, 5),
      delay: -rint(0, 8),
      color: palette[(i + 2) % palette.length],
    });
  });

  const stars: [number, number][] = [];
  for (let i = 0; i < 40; i++) stars.push([snap(rnd() * CITY_W, 4), snap(rnd() * CITY_H, 4)]);

  return {
    width: CITY_W,
    height: CITY_H,
    rows,
    mainlandLeft: 56,
    mainlandRight: CITY_W - 56,
    avenues,
    streets,
    park,
    pond,
    buildings,
    bridges,
    lanes,
    stars,
  };
}

/** Finds the building under a map-unit point, if any. */
export function buildingAt(city: City, x: number, y: number): Building | undefined {
  return city.buildings.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
}

export interface View {
  scale: number;
  tx: number;
  ty: number;
}

/** Keeps the map from being dragged completely off screen. */
export function clampView(v: View, viewportW: number, viewportH: number, minScale = 0.4, maxScale = 4): View {
  const scale = Math.min(maxScale, Math.max(minScale, v.scale));
  const mapW = CITY_W * scale;
  const mapH = CITY_H * scale;
  const slackX = Math.max(0, (viewportW - mapW) / 2);
  const slackY = Math.max(0, (viewportH - mapH) / 2);
  const minTx = mapW > viewportW ? viewportW - mapW - 80 : slackX;
  const maxTx = mapW > viewportW ? 80 : slackX;
  const minTy = mapH > viewportH ? viewportH - mapH - 80 : slackY;
  const maxTy = mapH > viewportH ? 80 : slackY;
  return {
    scale,
    tx: Math.min(maxTx, Math.max(minTx, v.tx)),
    ty: Math.min(maxTy, Math.max(minTy, v.ty)),
  };
}

/** Zooms around a screen point so it stays under the finger/cursor. */
export function zoomAt(v: View, factor: number, px: number, py: number): View {
  const scale = v.scale * factor;
  return {
    scale,
    tx: px - (px - v.tx) * (scale / v.scale),
    ty: py - (py - v.ty) * (scale / v.scale),
  };
}

/** Initial view that fits the city width into the viewport. */
export function fitView(viewportW: number, viewportH: number): View {
  const scale = Math.min(1.3, Math.max(0.45, Math.min(viewportW / CITY_W, viewportH / CITY_H) * 1.45));
  return clampView(
    { scale, tx: (viewportW - CITY_W * scale) / 2, ty: (viewportH - CITY_H * scale) / 2 },
    viewportW,
    viewportH,
  );
}
