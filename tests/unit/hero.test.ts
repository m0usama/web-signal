import { describe, expect, it } from "vitest";
import { cleanFace, DEFAULT_HEROES, faceChars, glowOn, hasLook, normaliseHero, randomHero, shade } from "@/lib/hero";

describe("hero", () => {
  it("falls back to the avatar's default for bad input", () => {
    expect(normaliseHero(null, "a")).toEqual(DEFAULT_HEROES.a);
    expect(normaliseHero({ hat: "nope", outfit: "dino" }, "c")).toEqual({ ...DEFAULT_HEROES.c, outfit: "dino" });
    expect(hasLook(null)).toBe(false);
    expect(hasLook({ skin: "s2" })).toBe(true);
  });

  it("keeps old saved looks working", () => {
    const old = { skin: "s3", hair: "spiky", hairColor: "brown", suit: "red", trim: "black", eyes: "fierce", mask: "visor", face: "nosering" };
    const l = normaliseHero(old, "b");
    expect(l.skin).toBe("s3");
    expect(l.face).toBe(DEFAULT_HEROES.b.face);
    expect(l.mask).toBe(DEFAULT_HEROES.b.mask);
  });

  it("faces are exactly three visible characters", () => {
    expect(cleanFace("^_^")).toBe("^_^");
    expect(cleanFace("♥_♥")).toBe("♥_♥");
    expect(cleanFace("😀_😀")).toBe("😀_😀");
    expect(faceChars("😀_😀")).toHaveLength(3);
    expect(cleanFace("^^")).toBeNull();
    expect(cleanFace("^ ^")).toBeNull();
    expect(cleanFace(">_<")).toBe(">_<");
    expect(cleanFace("a\u0000b")).toBeNull();
    expect(cleanFace(42)).toBeNull();
  });

  it("colour helpers", () => {
    expect(glowOn("#FFC93C")).toBe("#10101E");
    expect(glowOn("#2A2A44")).toBe("#7DF9FF");
    expect(shade("#808080", 0.5)).toBe("#404040");
  });

  it("random looks are valid", () => {
    for (let i = 0; i < 50; i++) {
      const l = randomHero();
      expect(normaliseHero(l)).toEqual(l);
    }
  });
});
