import { describe, expect, it } from "vitest";
import { buildingAt, clampView, CITY_W, generateCity, zoomAt } from "@/lib/city";
import { mediaPath, validateFile } from "@/lib/upload";

describe("city", () => {
  it("is identical for both people", () => {
    expect(JSON.stringify(generateCity())).toBe(JSON.stringify(generateCity()));
  });

  it("has unique building ids and buildings inside the map", () => {
    const c = generateCity();
    expect(new Set(c.buildings.map((b) => b.id)).size).toBe(c.buildings.length);
    expect(c.buildings.length).toBeGreaterThan(80);
    for (const b of c.buildings) expect(b.x + b.w).toBeLessThanOrEqual(CITY_W);
    const b = c.buildings[10];
    expect(buildingAt(c, b.cx, b.cy)?.id).toBe(b.id);
  });

  it("zooms around the pointer and clamps the view", () => {
    const v = zoomAt({ scale: 1, tx: 0, ty: 0 }, 2, 100, 100);
    expect(v.scale).toBe(2);
    expect(v.tx).toBe(-100);
    expect(clampView({ scale: 50, tx: 0, ty: 0 }, 400, 800).scale).toBe(4);
  });
});

describe("uploads", () => {
  it("only accepts small images", () => {
    expect(validateFile({ type: "image/gif", size: 1000 })).toBeNull();
    expect(validateFile({ type: "video/mp4", size: 1000 })).toMatch(/ONLY/);
    expect(validateFile({ type: "image/png", size: 9 * 1024 * 1024 })).toMatch(/TOO BIG/);
  });

  it("builds the folder path the storage rules require", () => {
    expect(mediaPath("room", "user", "image/jpeg", "abc")).toBe("room/user/abc.jpg");
  });
});
