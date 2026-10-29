/**
 * City Quests: original landmarks on the map, each hosting a 2-player
 * game or daily activity. Positions are fixed to real rooftops (or the
 * park/bridge) of the generated city, so both people see them in the same place.
 */
import { CITY_H, CITY_W, generateCity, type City } from "./city";

export type QuestKey = "ttt" | "doodle" | "trivia" | "race" | "hotcold" | "web4" | "tot" | "memory" | "word";

export interface Landmark {
  key: QuestKey;
  name: string;
  activity: string;
  blurb: string;
  icon: string; // pixel icon key (see pixels.ts) or emoji
  emoji: string;
  /** Normalised 0..1 position on the map. */
  x: number;
  y: number;
  color: string;
}

interface Spot {
  key: QuestKey;
  name: string;
  activity: string;
  blurb: string;
  icon: string;
  emoji: string;
  color: string;
  /** Where we'd like it (normalised); snapped to the nearest free rooftop. */
  want: [number, number];
  place?: "bridge" | "park";
}

const SPOTS: Spot[] = [
  { key: "ttt", name: "THWIP TOWER", activity: "ROOFTOP TIC-TAC-TOE", blurb: "Three in a row on the tallest roof in town.", icon: "star", emoji: "✕", color: "#FF705C", want: [0.52, 0.16] },
  { key: "doodle", name: "INK ALLEY", activity: "GRAFFITI WALL", blurb: "Draw together, live. Undo, redo, send it to chat.", icon: "sparkle", emoji: "🖍", color: "#A75CFF", want: [0.3, 0.24] },
  { key: "trivia", name: "THE DAILY SIGNAL", activity: "DAILY TRIVIA", blurb: "Five questions a day. Spider facts and brain teasers.", icon: "moon", emoji: "📰", color: "#FFC93C", want: [0.7, 0.27] },
  { key: "race", name: "SIGNAL BRIDGE", activity: "WEB-SWING RACE", blurb: "Swing across the skyline. Beat their time today.", icon: "zap", emoji: "🕸", color: "#169FE8", want: [0.1, 0.42], place: "bridge" },
  { key: "hotcold", name: "SPIDER-SENSE ANTENNA", activity: "HOT & COLD HUNT", blurb: "Hide a secret spot on the map. Can they sense it?", icon: "spider", emoji: "📡", color: "#E2223B", want: [0.66, 0.44] },
  { key: "web4", name: "ROOFTOP 23", activity: "WEB FOUR", blurb: "Drop web-balls. Four in a row wins.", icon: "web", emoji: "🔴", color: "#1F4FE0", want: [0.3, 0.6] },
  { key: "tot", name: "NIGHT-OWL DINER", activity: "THIS OR THAT", blurb: "Eight quick picks a day. How in sync are you?", icon: "coffee", emoji: "🦉", color: "#3FD08A", want: [0.68, 0.6] },
  { key: "memory", name: "PIGEON HQ", activity: "PIGEON PAIRS", blurb: "Find the matching pairs. Take turns, most pairs wins.", icon: "pigeon", emoji: "🐦", color: "#8FB3FF", want: [0.46, 0.74] },
  { key: "word", name: "CANDY CRATER", activity: "SECRET WORD", blurb: "Set a secret word. They guess letters before the web snaps.", icon: "pizza", emoji: "🍬", color: "#FF65AD", want: [0.42, 0.36], place: "park" },
];

export function placeLandmarks(city: City = generateCity()): Landmark[] {
  const taken = new Set<string>();
  return SPOTS.map((s) => {
    let x = s.want[0] * CITY_W;
    let y = s.want[1] * CITY_H;
    if (s.place === "bridge" && city.bridges.length) {
      const b = [...city.bridges].sort(
        (a, b2) => Math.hypot(a.x + a.w / 2 - x, a.y - y) - Math.hypot(b2.x + b2.w / 2 - x, b2.y - y),
      )[0];
      x = b.x + b.w / 2;
      y = b.y + b.h / 2;
    } else if (s.place === "park") {
      x = city.park.x + city.park.w * 0.5;
      y = city.park.y + city.park.h * 0.78;
    } else {
      const best = city.buildings
        .filter((b) => !taken.has(b.id) && b.w >= 24 && b.h >= 24)
        .sort((a, b) => Math.hypot(a.cx - x, a.cy - y) - Math.hypot(b.cx - x, b.cy - y))[0];
      if (best) {
        taken.add(best.id);
        x = best.cx;
        y = best.cy;
      }
    }
    return { key: s.key, name: s.name, activity: s.activity, blurb: s.blurb, icon: s.icon, emoji: s.emoji, color: s.color, x: x / CITY_W, y: y / CITY_H };
  });
}

export const LANDMARKS = placeLandmarks();

export function landmark(key: QuestKey): Landmark {
  return LANDMARKS.find((l) => l.key === key)!;
}

export type QuestStatus = { tone: "turn" | "new" | "wait" | "done" | "idle"; text: string };
