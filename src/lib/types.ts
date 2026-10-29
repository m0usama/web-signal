export type AvatarKey = "a" | "b" | "c";
export type SignalMode = "normal" | "day" | "ghost";
export type MessageKind = "text" | "image" | "gif" | "sticker" | "voice";
export type PokeKind = "heart" | "spider" | "zap" | "star" | "hug" | "web" | "fingerheart";
export type Theme = "auto" | "day" | "night";
export type Tab = "map" | "comms" | "signals" | "play" | "profile";

export type Mood = "happy" | "love" | "missing" | "sleepy" | "busy" | "study" | "work" | "food" | "gaming" | "sad" | "travel" | "party";

export interface Profile {
  id: string;
  display_name: string;
  avatar_key: AvatarKey;
  map_x: number;
  map_y: number;
  last_seen_at: string | null;
  foreground?: boolean;
  mood?: Mood | null;
  mood_at?: string | null;
}

export interface SparkAnswer {
  room_id: string;
  day: string;
  user_id: string;
  answer: string;
  created_at: string;
}

export type GameKind = "ttt" | "web4" | "memory" | "hotcold" | "word";

export interface Game {
  id: string;
  room_id: string;
  kind: GameKind;
  board: string;
  /** Public game info (scores, guesses, hints…). Hidden things stay on the server. */
  state?: Record<string, unknown>;
  x_player: string;
  o_player: string;
  turn: string | null;
  winner: "X" | "O" | "draw" | "void" | null;
  created_at: string;
  updated_at: string;
}

export interface Countdown {
  at: string | null;
  label: string | null;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  client_id: string;
  kind: MessageKind;
  body: string | null;
  sticker: string | null;
  media_path: string | null;
  mode: SignalMode;
  ghost_seconds: number;
  expires_at: string | null;
  opened_at: string | null;
  created_at: string;
  duration_ms?: number | null;
  /** Client-only state for optimistic sends. */
  _status?: "sending" | "failed";
  _localPreview?: string;
}

export interface Reaction {
  message_id: string;
  user_id: string;
  emoji: string;
}

export interface Poke {
  id: string;
  room_id: string;
  sender_id: string;
  kind: PokeKind;
  created_at: string;
}

export interface SignalDrop {
  id: string;
  room_id: string;
  sender_id: string;
  client_id: string;
  x: number;
  y: number;
  building_id: string | null;
  body: string | null;
  sticker: string | null;
  media_path: string | null;
  media_kind: "image" | "gif" | null;
  mode: "ghost" | "day";
  ghost_seconds: number;
  expires_at: string | null;
  opened_at: string | null;
  created_at: string;
}

export interface Settings {
  user_id: string;
  sound_on: boolean;
  volume: number;
  theme: Theme;
  reduced_fx: boolean;
}

export interface Badge {
  user_id: string;
  badge_key: string;
  earned_at: string;
}

export interface RoomMember {
  room_id: string;
  user_id: string;
  last_read_at: string;
}

/** One private room = one person you can talk to. */
export interface Contact {
  roomId: string;
  roomCreatedAt: string;
  countdown?: Countdown;
  partner: Profile;
  unread: number;
  /** Messages only: no pokes, drops, games, spark, countdown or tune. */
  chatOnly?: boolean;
}

export interface Bootstrap {
  roomId: string;
  roomCreatedAt: string;
  countdown?: Countdown;
  me: Profile;
  partner: Profile;
  settings: Settings;
  members: RoomMember[];
  /** Everyone you share a room with (the current one included). */
  contacts?: Contact[];
  /** Screen to open on (kept when switching between people). */
  initialTab?: Tab;
  /** This chat is messages only. */
  chatOnly?: boolean;
}

export interface DailyAnswer {
  room_id: string;
  day: string;
  kind: "trivia" | "tot";
  user_id: string;
  answers: number[];
  score: number;
  created_at: string;
}

export interface RaceRun {
  id: string;
  room_id: string;
  user_id: string;
  day: string;
  ms: number;
  created_at: string;
}

export interface HeroScore {
  user_id: string;
  points: number;
}
