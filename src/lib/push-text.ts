/** Notification wording. Never includes message contents (lock screens are public). */

export interface PushEvent {
  type: "messages" | "pokes" | "signal_drops" | "spark_answers" | "games" | "tune" | "daily_answers" | "race_runs" | "daily";
  kind?: string | null;
  mode?: string | null;
  winner?: string | null;
}

const GAME_PLACE: Record<string, string> = {
  ttt: "THWIP TOWER",
  web4: "ROOFTOP 23",
  memory: "PIGEON HQ",
  hotcold: "SPIDER-SENSE ANTENNA",
  word: "CANDY CRATER",
};

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
    case "games": {
      const place = GAME_PLACE[e.kind ?? "ttt"] ?? "the rooftop";
      if (e.winner === "new") return { title: from, body: `🎮 started a game at ${place}`, tag: `game-${e.kind}` };
      if (e.winner === "X" || e.winner === "O") return { title: from, body: `🏆 the game at ${place} is over — come see`, tag: `game-${e.kind}` };
      if (e.winner === "draw") return { title: from, body: `🤝 the game at ${place} ended in a draw`, tag: `game-${e.kind}` };
      return { title: from, body: `🎮 your move at ${place}`, tag: `game-${e.kind}` };
    }
    case "daily_answers":
      return e.kind === "tot"
        ? { title: from, body: "🦉 did today's This or That — how in sync are you?", tag: "tot" }
        : { title: from, body: "📰 played today's trivia — beat their score", tag: "trivia" };
    case "race_runs":
      return { title: from, body: "🕸 set a new Web-Swing Race time — beat it", tag: "race" };
    case "daily":
      return { title: "WEB//SIGNAL", body: "📰 Today's trivia is out at THE DAILY SIGNAL", tag: "trivia" };
    case "tune":
      return { title: from, body: "♪ played your tune — open the app to hear it next time", tag: "tune" };
  }
}
