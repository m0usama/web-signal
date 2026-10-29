import { describe, expect, it } from "vitest";
import { countdownText, moodInfo, sparkDay, sparkQuestion, SPARK_QUESTIONS, tttWinner, winningLine } from "@/lib/spark";
import { pushText } from "@/lib/push-text";
import { baseMime, formatDuration, ghostSecondsForVoice, voiceExtension } from "@/lib/voice";

describe("daily spark", () => {
  it("uses the London calendar day", () => {
    // 23:30 UTC in summer is already the next day in London (BST).
    expect(sparkDay(new Date("2026-07-01T23:30:00Z"))).toBe("2026-07-02");
    expect(sparkDay(new Date("2026-12-01T23:30:00Z"))).toBe("2026-12-01");
  });
  it("gives both people the same question each day and rotates", () => {
    expect(sparkQuestion("2026-10-29")).toBe(sparkQuestion("2026-10-29"));
    expect(sparkQuestion("2026-10-29")).not.toBe(sparkQuestion("2026-10-30"));
    expect(SPARK_QUESTIONS).toContain(sparkQuestion("2027-01-01"));
  });
});

describe("countdown", () => {
  const now = Date.parse("2026-10-29T12:00:00Z");
  it("formats the time left", () => {
    expect(countdownText("2026-11-01T17:30:00Z", now)).toBe("3D 05H");
    expect(countdownText("2026-10-29T14:05:00Z", now)).toBe("2H 05M");
    expect(countdownText("2026-10-29T12:00:30Z", now)).toBe("1M");
    expect(countdownText("2026-10-29T11:00:00Z", now)).toBe("NOW!");
    expect(countdownText("2026-10-28T12:00:00Z", now)).toBeNull();
    expect(countdownText(null, now)).toBeNull();
  });
});

describe("tic-tac-toe", () => {
  it("detects wins, draws and ongoing games", () => {
    expect(tttWinner("XXX.O.O..")).toBe("X");
    expect(winningLine("XXX.O.O..")).toEqual([0, 1, 2]);
    expect(tttWinner("O..O..O..")).toBe("O");
    expect(tttWinner("XOXXOOOXX")).toBe("draw");
    expect(tttWinner("X........")).toBeNull();
  });
});

describe("voice notes", () => {
  it("picks storage types and file extensions", () => {
    expect(baseMime("audio/mp4;codecs=mp4a.40.2")).toBe("audio/mp4");
    expect(voiceExtension("audio/mp4")).toBe("m4a");
    expect(voiceExtension("audio/webm;codecs=opus")).toBe("webm");
  });
  it("gives ghost voice notes enough time to be heard once", () => {
    expect(ghostSecondsForVoice(4200)).toBe(10);
    expect(ghostSecondsForVoice(500)).toBe(6);
    expect(ghostSecondsForVoice(58_000)).toBe(60);
    expect(formatDuration(7400)).toBe("0:07");
  });
});

describe("notifications", () => {
  it("never include message contents", () => {
    const t = pushText({ type: "messages", kind: "text", mode: "normal" }, "SPIDEY");
    expect(t.title).toBe("SPIDEY");
    expect(t.body).toBe("💬 new signal");
    expect(pushText({ type: "messages", kind: "voice" }, "X").body).toMatch(/voice/);
    expect(pushText({ type: "messages", kind: "image", mode: "ghost" }, "X").body).toMatch(/ghost/);
    expect(pushText({ type: "pokes", kind: "heart" }, "X").body).toMatch(/HEY YOU/);
    expect(pushText({ type: "games", winner: null }, "X").body).toMatch(/your move/);
  });
  it("knows the moods", () => {
    expect(moodInfo("love")?.emoji).toBe("🥰");
    expect(moodInfo("nope")).toBeNull();
  });
});
