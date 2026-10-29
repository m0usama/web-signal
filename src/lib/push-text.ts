/** Notification wording. Never includes message contents (lock screens are public). */

export interface PushEvent {
  type: "messages" | "pokes" | "signal_drops" | "spark_answers" | "games" | "tune";
  kind?: string | null;
  mode?: string | null;
  winner?: string | null;
}

const POKE_LINES: Record<string, string> = {
  heart: "HEY YOU! 💜",
  fingerheart: "MISS YOU! 🫶",
  hug: "SQUEEZE! 🤗",
  zap: "ZZZAP! ⚡",
  star: "YOU'RE A STAR! ⭐",
  spider: "INCOMING SIGNAL! 🕷",
  web: "GOTCHA! 🕸",
};

export function pushText(e: PushEvent, from: string): { title: string; body: string; tag: string } {
  switch (e.type) {
    case "messages":
      if (e.mode === "ghost") return { title: from, body: "👻 sent you a ghost signal", tag: "msg" };
      if (e.kind === "voice") return { title: from, body: "📻 voice signal incoming", tag: "msg" };
      if (e.kind === "image" || e.kind === "gif") return { title: from, body: "📷 sent a photo", tag: "msg" };
      if (e.kind === "sticker") return { title: from, body: "sent a sticker", tag: "msg" };
      return { title: from, body: "💬 new signal", tag: "msg" };
    case "pokes":
      return { title: from, body: POKE_LINES[e.kind ?? ""] ?? "poked you!", tag: "poke" };
    case "signal_drops":
      return { title: from, body: "🌃 left a signal drop on a rooftop", tag: "drop" };
    case "spark_answers":
      return { title: from, body: "✨ answered today's spark — your turn", tag: "spark" };
    case "games":
      if (e.winner === "X" || e.winner === "O") return { title: from, body: "🏆 the rooftop game is over — come see", tag: "game" };
      if (e.winner === "draw") return { title: from, body: "🤝 rooftop game ended in a draw", tag: "game" };
      return { title: from, body: "🎮 your move on the rooftop", tag: "game" };
    case "tune":
      return { title: from, body: "♪ played your tune — open the app to hear it next time", tag: "tune" };
  }
}
