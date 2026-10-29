import { describe, expect, it } from "vitest";
import { formatLeft, isLive, msLeft } from "@/lib/expiry";

const base = { mode: "normal" as const, expires_at: null, opened_at: null, ghost_seconds: 10 };
const T = Date.parse("2026-10-29T12:00:00Z");

describe("expiry", () => {
  it("normal messages never expire", () => {
    expect(isLive(base, T)).toBe(true);
    expect(msLeft(base, T)).toBeNull();
  });

  it("24-hour signals expire at expires_at", () => {
    const m = { ...base, mode: "day" as const, expires_at: new Date(T + 5000).toISOString() };
    expect(isLive(m, T)).toBe(true);
    expect(msLeft(m, T)).toBe(5000);
    expect(isLive(m, T + 5000)).toBe(false);
  });

  it("ghosts live until opened, then for ghost_seconds", () => {
    const unopened = { ...base, mode: "ghost" as const, expires_at: new Date(T + 864e5).toISOString() };
    expect(isLive(unopened, T)).toBe(true);
    const opened = { ...unopened, opened_at: new Date(T - 4000).toISOString() };
    expect(msLeft(opened, T)).toBe(6000);
    expect(isLive(opened, T + 6000)).toBe(false);
  });

  it("formats time left", () => {
    expect(formatLeft(4200)).toBe("5s");
    expect(formatLeft(90_000)).toBe("1m");
    expect(formatLeft(3 * 3600e3 + 5 * 60e3)).toBe("3h 05m");
  });
});
