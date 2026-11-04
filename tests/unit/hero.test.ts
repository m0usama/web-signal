import { describe, expect, it } from "vitest";
import { DEFAULT_HEROES, glowOn, hasLook, normaliseHero, randomHero, shade } from "@/lib/hero";

describe("hero", () => {
  it("falls back to the avatar's default for bad input", () => {
    expect(normaliseHero(null, "a")).toEqual(DEFAULT_HEROES.a);
    expect(normaliseHero({ suit: "nope", eyes: "hearts" }, "c")).toEqual({ ...DEFAULT_HEROES.c, eyes: "hearts" });
    expect(hasLook(null)).toBe(false);
    expect(hasLook({ skin: "s2" })).toBe(true);
  });

  it("picks readable visor eye colours and shades", () => {
    expect(glowOn("#FFC93C")).toBe("#10101E");
    expect(glowOn("#2A2A44")).toBe("#7DF9FF");
    expect(shade("#808080", 0.5)).toBe("#404040");
  });

  it("random looks are valid", () => {
    for (let i = 0; i < 50; i++) {
      const l = randomHero();
      expect(normaliseHero(l)).toEqual(l);
      expect(l.suit).not.toBe(l.trim);
    }
  });
});
