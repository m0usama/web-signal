/** Daily spark: one question per day (same for both of you), Europe/London calendar. */

export const SPARK_QUESTIONS = [
  "What's one tiny thing that made you smile today?",
  "If we had a secret rooftop for one night, what would we bring?",
  "What song should play when we walk into a room together?",
  "Which memory of us would you replay on a loop?",
  "What's a food you could eat every day for a month?",
  "If you had one superpower for 24 hours, what would you do first?",
  "What's something you've never told me because it felt too small?",
  "Describe your perfect lazy Sunday in five words.",
  "What's a place you want us to see before next year?",
  "What did you dream about recently?",
  "What's your comfort movie and why?",
  "If our story was a comic, what would this week's chapter be called?",
  "What's one habit of mine you secretly love?",
  "Rain on the window or snow outside: which mood are you today?",
  "What would your theme song sound like?",
  "What's the best compliment you've ever received?",
  "If we opened a tiny shop together, what would it sell?",
  "What made you laugh the hardest this month?",
  "What's one thing you're proud of this week?",
  "What's the first thing you'd cook for me?",
  "Which season feels most like us?",
  "What's something you want to learn this year?",
  "If you could send a message to yourself five years ago, what would it say?",
  "What's your go-to order at a café?",
  "Pick three emojis that describe today.",
  "Where would you hide if you were a city pigeon?",
  "What's a small promise you want us to keep?",
  "What did you want to be when you were little?",
  "What's your favourite way to be cheered up?",
  "What's one thing on your mind right now?",
  "If tonight had a colour, what would it be?",
  "Which smell instantly takes you somewhere else?",
  "What's a tradition you'd love us to start?",
  "What's the bravest thing you've done?",
  "If we had a mascot, what animal would it be?",
  "What's the last thing that surprised you?",
  "What's your ideal midnight snack?",
  "Name a moment you felt really understood.",
  "If you could live in any film's world for a day, which one?",
  "What do you think I'm doing right now?",
  "What's one word for how you feel today?",
  "What's a sound that makes you feel at home?",
  "What's your favourite photo of us and why?",
  "What would our dream city skyline have on it?",
  "What are you looking forward to this week?",
  "What's something you'd like more of in your life?",
  "If we swapped lives for a day, what would surprise you?",
  "What's your hidden talent?",
  "Which planet would you visit first?",
  "What's the kindest thing a stranger has done for you?",
  "Dawn walk or midnight drive?",
  "What's your favourite thing about where you live?",
  "What's one thing I should try that you love?",
  "What would you put in a time capsule for us?",
  "If today was a video game level, what's the boss?",
  "What's your favourite word?",
  "What's a little luxury you love?",
  "What made today different from yesterday?",
  "What's a dream date that costs nothing?",
  "Write the first line of our next chapter.",
] as const;

/** YYYY-MM-DD in Europe/London (matches the database's spark_today()). */
export function sparkDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function sparkQuestion(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const n = Math.floor(Date.UTC(y, m - 1, d) / 864e5);
  return SPARK_QUESTIONS[((n % SPARK_QUESTIONS.length) + SPARK_QUESTIONS.length) % SPARK_QUESTIONS.length];
}

export const MOODS = [
  { key: "happy", emoji: "😊", label: "HAPPY" },
  { key: "love", emoji: "🥰", label: "IN LOVE" },
  { key: "missing", emoji: "🥺", label: "MISSING YOU" },
  { key: "sleepy", emoji: "😴", label: "SLEEPY" },
  { key: "busy", emoji: "⏳", label: "BUSY" },
  { key: "study", emoji: "📚", label: "STUDYING" },
  { key: "work", emoji: "💼", label: "AT WORK" },
  { key: "food", emoji: "🍜", label: "EATING" },
  { key: "gaming", emoji: "🎮", label: "GAMING" },
  { key: "sad", emoji: "🌧️", label: "LOW" },
  { key: "travel", emoji: "✈️", label: "TRAVELLING" },
  { key: "party", emoji: "🎉", label: "PARTY" },
] as const;

export function moodInfo(key: string | null | undefined) {
  return MOODS.find((m) => m.key === key) ?? null;
}

/** "3D 04H", "5H 12M", "12M", "NOW!" */
export function countdownText(at: string | null | undefined, now = Date.now()): string | null {
  if (!at) return null;
  const ms = Date.parse(at) - now;
  if (ms <= -6 * 3600e3) return null;
  if (ms <= 0) return "NOW!";
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}D ${String(h % 24).padStart(2, "0")}H`;
  if (h > 0) return `${h}H ${String(m % 60).padStart(2, "0")}M`;
  return `${Math.max(1, m)}M`;
}

/** Winner of a 9-char board ('.', 'X', 'O'), 'draw', or null (mirrors the database). */
export function tttWinner(board: string): "X" | "O" | "draw" | null {
  const L = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of L) {
    if (board[a] !== "." && board[a] === board[b] && board[a] === board[c]) return board[a] as "X" | "O";
  }
  return board.includes(".") ? null : "draw";
}

export function winningLine(board: string): number[] | null {
  const L = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6],
  ];
  for (const l of L) {
    const [a, b, c] = l;
    if (board[a] !== "." && board[a] === board[b] && board[a] === board[c]) return l;
  }
  return null;
}
