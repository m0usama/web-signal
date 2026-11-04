import { describe, expect, it } from "vitest";
import { DEFAULT_HEROES, H, HATS, hasLook, heroPixels, MASKS, normaliseHero, OUTFITS, randomHero, W } from "@/lib/hero";

describe("hero", () => {
  it("falls back to the avatar's default for bad input", () => {
    expect(normaliseHero(null, "a")).toEqual(DEFAULT_HEROES.a);
    expect(normaliseHero({ suit: "nope", eyes: "hearts" }, "c")).toEqual({ ...DEFAULT_HEROES.c, eyes: "hearts" });
    expect(hasLook(null)).toBe(false);
    expect(hasLook({ skin: "s2" })).toBe(true);
  });

  it("draws every mask, hat and outfit inside the grid", () => {
    for (const m of MASKS)
      for (const h of HATS)
        for (const o of OUTFITS) {
          const g = heroPixels({ ...DEFAULT_HEROES.b, mask: m.key, hat: h.key, outfit: o.key });
          expect(g.length).toBe(H);
          expect(g.every((r) => r.length === W)).toBe(true);
        }
  });

  it("random looks are valid", () => {
    for (let i = 0; i < 50; i++) {
      const l = randomHero();
      expect(normaliseHero(l)).toEqual(l);
      expect(l.suit).not.toBe(l.trim);
    }
  });
});
