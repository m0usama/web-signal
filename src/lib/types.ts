export type AvatarKey = "a" | "b";
export type SignalMode = "normal" | "day" | "ghost";
export type MessageKind = "text" | "image" | "gif" | "sticker";
export type PokeKind = "heart" | "spider" | "zap" | "star" | "hug" | "web" | "fingerheart";
export type Theme = "auto" | "day" | "night";
export type Tab = "map" | "comms" | "signals" | "profile";

export interface Profile {
  id: string;
  display_name: string;
  avatar_key: AvatarKey;
  map_x: number;
  map_y: number;
  last_seen_at: string | null;
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

export interface Bootstrap {
  roomId: string;
  roomCreatedAt: string;
  me: Profile;
  partner: Profile;
  settings: Settings;
  members: RoomMember[];
}
