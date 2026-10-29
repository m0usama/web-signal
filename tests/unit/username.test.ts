import { describe, expect, it } from "vitest";
import { normaliseUsername, USERNAME_PATTERN, usernameToEmail } from "@/lib/username";

describe("usernames", () => {
  it("map to the internal login address", () => {
    expect(usernameToEmail("  SpiderZiya ")).toBe("spiderziya@web-signal.local");
    expect(usernameToEmail("spidey")).toBe("spidey@web-signal.local");
  });
  it("only allow simple names", () => {
    expect(USERNAME_PATTERN.test(normaliseUsername("Spidey"))).toBe(true);
    expect(USERNAME_PATTERN.test("a@b.com")).toBe(false);
    expect(USERNAME_PATTERN.test("x")).toBe(false);
  });
});
