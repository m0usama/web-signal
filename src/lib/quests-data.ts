/**
 * Content for the daily activities. The same day gives both people the same
 * questions (Europe/London calendar, like the daily spark).
 */
import { sparkDay } from "./spark";

export interface TriviaQ {
  q: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  tag: "SPIDER FACT" | "GENERAL" | "SCIENCE" | "TECH";
}

const T = (tag: TriviaQ["tag"], q: string, options: [string, string, string, string], answer: 0 | 1 | 2 | 3): TriviaQ => ({ q, options, answer, tag });

export const TRIVIA: TriviaQ[] = [
  // spider facts
  T("SPIDER FACT", "How many legs does a spider have?", ["6", "8", "10", "12"], 1),
  T("SPIDER FACT", "Spiders belong to which group of animals?", ["Insects", "Arachnids", "Crustaceans", "Millipedes"], 1),
  T("SPIDER FACT", "Most spiders have how many eyes?", ["2", "4", "6", "8"], 3),
  T("SPIDER FACT", "What do spiders use to spin silk?", ["Spinnerets", "Fangs", "Pedipalps", "Antennae"], 0),
  T("SPIDER FACT", "Spider silk is mostly made of…", ["Sugar", "Fat", "Protein", "Salt"], 2),
  T("SPIDER FACT", "Which is the heaviest spider in the world?", ["Huntsman", "Goliath birdeater", "Wolf spider", "Black widow"], 1),
  T("SPIDER FACT", "What's the fear of spiders called?", ["Acrophobia", "Arachnophobia", "Claustrophobia", "Nyctophobia"], 1),
  T("SPIDER FACT", "The tiny, colourful dancing peacock spider comes from…", ["Brazil", "Australia", "Japan", "Kenya"], 1),
  T("SPIDER FACT", "A spider's body has two main parts: the abdomen and the…", ["Thorax", "Cephalothorax", "Carapace", "Pedicel"], 1),
  T("SPIDER FACT", "Which spider mum carries her babies on her back?", ["Wolf spider", "Orb weaver", "Jumping spider", "Cellar spider"], 0),
  T("SPIDER FACT", "Many orb-weaver spiders recycle their old web by…", ["Burying it", "Eating it", "Giving it away", "Leaving it"], 1),
  T("SPIDER FACT", "Weight for weight, spider silk compared with steel is…", ["Weaker", "Stronger", "Exactly the same", "Heavier"], 1),
  T("SPIDER FACT", "The diving bell spider lives…", ["In deserts", "Underwater", "In caves only", "On mountain tops"], 1),
  T("SPIDER FACT", "The bolas spider catches moths with…", ["A huge web", "A sticky blob on a single thread", "Its jump", "Venom spray"], 1),
  T("SPIDER FACT", "A trapdoor spider waits for prey…", ["In a burrow with a hinged lid", "On flowers", "On water", "In tree tops"], 0),
  T("SPIDER FACT", "One jumping spider (Bagheera kiplingi) is unusual because it mostly eats…", ["Fish", "Plants", "Other spiders", "Nothing"], 1),
  T("SPIDER FACT", "Many tarantulas defend themselves by flicking…", ["Silk", "Itchy hairs", "Water", "Sand"], 1),
  T("SPIDER FACT", "What colour is spider blood?", ["Red", "Green", "Pale blue", "Black"], 2),
  T("SPIDER FACT", "Unlike insects, spiders don't have…", ["Legs", "Eyes", "Antennae", "A mouth"], 2),
  T("SPIDER FACT", "Baby spiders can travel far by…", ["Riding silk threads on the wind", "Hitching rides on birds", "Swimming", "Rolling"], 0),
  T("SPIDER FACT", "Darwin's bark spider is famous for webs that can span…", ["A teacup", "A door", "Whole rivers", "A football pitch"], 2),
  T("SPIDER FACT", "A black widow has which marking?", ["A white cross", "A red hourglass", "Yellow stripes", "Blue spots"], 1),
  T("SPIDER FACT", "Spider silk leaves the body as…", ["A liquid that hardens as it's pulled", "Ready-made thread", "A powder", "A gas"], 0),
  T("SPIDER FACT", "Roughly how many spider species are known?", ["500", "5,000", "50,000", "5 million"], 2),
  T("SPIDER FACT", "Which continent has no native spiders?", ["Australia", "Antarctica", "Europe", "Asia"], 1),
  T("SPIDER FACT", "Spiders mostly sense vibrations through their…", ["Legs", "Eyes", "Fangs", "Silk only"], 0),
  T("SPIDER FACT", "Jumping spiders are especially known for…", ["Their excellent eyesight", "Glowing", "Living underwater", "Being huge"], 0),
  T("SPIDER FACT", "Which word means a spider's sticky, spiral web shape?", ["Funnel web", "Orb web", "Sheet web", "Cobweb"], 1),
  // general
  T("GENERAL", "What colour do you get by mixing red and blue paint?", ["Green", "Purple", "Orange", "Brown"], 1),
  T("GENERAL", "What does “www” stand for in a web address?", ["World Wide Web", "Wide Web World", "Web Window Wire", "World Web Wizard"], 0),
  T("GENERAL", "Who invented the World Wide Web?", ["Tim Berners-Lee", "Alan Turing", "Ada Lovelace", "Steve Jobs"], 0),
  T("GENERAL", "Which planet is known as the Red Planet?", ["Venus", "Mars", "Jupiter", "Mercury"], 1),
  T("GENERAL", "What's the largest ocean on Earth?", ["Atlantic", "Indian", "Arctic", "Pacific"], 3),
  T("GENERAL", "How many minutes are in a day?", ["1,440", "1,200", "960", "2,400"], 0),
  T("GENERAL", "What is the chemical symbol for gold?", ["Go", "Gd", "Au", "Ag"], 2),
  T("GENERAL", "What's the fastest land animal?", ["Lion", "Cheetah", "Horse", "Greyhound"], 1),
  T("GENERAL", "What is the capital of Japan?", ["Kyoto", "Osaka", "Tokyo", "Seoul"], 2),
  T("GENERAL", "How many continents are there?", ["5", "6", "7", "8"], 2),
  T("GENERAL", "What's the largest planet in our solar system?", ["Saturn", "Jupiter", "Neptune", "Earth"], 1),
  T("GENERAL", "How many hearts does an octopus have?", ["1", "2", "3", "8"], 2),
  T("GENERAL", "What's the tallest animal?", ["Elephant", "Giraffe", "Camel", "Moose"], 1),
  T("GENERAL", "Which bird can fly backwards?", ["Hummingbird", "Pigeon", "Eagle", "Owl"], 0),
  T("GENERAL", "In which city is the Eiffel Tower?", ["Rome", "London", "Paris", "Madrid"], 2),
  T("GENERAL", "“Big Ben” is really the name of a…", ["Tower", "Clock face", "Bell", "Bridge"], 2),
  T("GENERAL", "What's the London Underground's nickname?", ["The Pipe", "The Tube", "The Line", "The Loop"], 1),
  T("GENERAL", "How many cards are in a standard deck (no jokers)?", ["48", "50", "52", "54"], 2),
  T("GENERAL", "How many players does a football team have on the pitch?", ["9", "10", "11", "12"], 2),
  T("GENERAL", "Which instrument usually has 88 keys?", ["Organ", "Piano", "Accordion", "Xylophone"], 1),
  T("GENERAL", "What's the tallest mountain above sea level?", ["K2", "Kilimanjaro", "Everest", "Mont Blanc"], 2),
  T("GENERAL", "How many hours are in a week?", ["148", "158", "168", "178"], 2),
  T("GENERAL", "Who painted the Mona Lisa?", ["Van Gogh", "Picasso", "Leonardo da Vinci", "Michelangelo"], 2),
  T("GENERAL", "What's the main ingredient of guacamole?", ["Avocado", "Pea", "Cucumber", "Lime"], 0),
  T("GENERAL", "Which fruit wears its seeds on the outside?", ["Raspberry", "Strawberry", "Kiwi", "Banana"], 1),
  T("GENERAL", "Which country gave the Statue of Liberty to the USA?", ["UK", "Spain", "France", "Italy"], 2),
  T("GENERAL", "A baby kangaroo is called a…", ["Cub", "Kit", "Joey", "Pup"], 2),
  T("GENERAL", "A group of crows is called a…", ["Murder", "Gang", "Flock party", "Crew"], 0),
  T("GENERAL", "What's the largest mammal?", ["Elephant", "Blue whale", "Giraffe", "Orca"], 1),
  T("GENERAL", "How many strings does a standard guitar have?", ["4", "5", "6", "7"], 2),
  T("GENERAL", "Which ocean lies between Europe and the Americas?", ["Pacific", "Atlantic", "Indian", "Southern"], 1),
  T("GENERAL", "Owls can turn their heads about…", ["90°", "180°", "270°", "360°"], 2),
  T("GENERAL", "Which city is nicknamed “the Big Apple”?", ["Los Angeles", "New York", "Chicago", "Boston"], 1),
  T("GENERAL", "Who was the first person to walk on the Moon?", ["Buzz Aldrin", "Yuri Gagarin", "Neil Armstrong", "Sally Ride"], 2),
  T("GENERAL", "How many colours are in a rainbow?", ["5", "6", "7", "8"], 2),
  T("GENERAL", "Which sealed food can last for thousands of years?", ["Bread", "Honey", "Cheese", "Milk"], 1),
  T("GENERAL", "What do bees do to tell each other where flowers are?", ["Buzz louder", "A waggle dance", "Change colour", "Leave a scent trail only"], 1),
  T("GENERAL", "What's the biggest desert on Earth (counting cold deserts)?", ["Sahara", "Gobi", "Antarctica", "Arabian"], 2),
  // science
  T("SCIENCE", "What's the closest star to Earth?", ["Polaris", "Sirius", "The Sun", "Alpha Centauri"], 2),
  T("SCIENCE", "Sunlight takes about how long to reach Earth?", ["8 seconds", "8 minutes", "8 hours", "8 days"], 1),
  T("SCIENCE", "Mixing red, green and blue light makes…", ["Black", "Brown", "White", "Grey"], 2),
  T("SCIENCE", "At sea level, water boils at…", ["90°C", "100°C", "110°C", "120°C"], 1),
  T("SCIENCE", "Which gas do plants take in to make food?", ["Oxygen", "Nitrogen", "Carbon dioxide", "Helium"], 2),
  T("SCIENCE", "What's the hardest natural substance?", ["Gold", "Iron", "Diamond", "Quartz"], 2),
  T("SCIENCE", "Which metal is liquid at room temperature?", ["Mercury", "Silver", "Tin", "Lead"], 0),
  T("SCIENCE", "How many bones are in an adult human body?", ["106", "206", "306", "406"], 1),
  T("SCIENCE", "What's the largest organ of the human body?", ["Liver", "Brain", "Skin", "Lungs"], 2),
  T("SCIENCE", "What's the longest bone in the human body?", ["Spine", "Femur", "Tibia", "Humerus"], 1),
  T("SCIENCE", "Roughly how long does the Moon take to orbit Earth?", ["7 days", "27 days", "90 days", "365 days"], 1),
  T("SCIENCE", "“Shooting stars” are really…", ["Falling stars", "Meteors", "Satellites", "Comets landing"], 1),
  T("SCIENCE", "Which planet rolls around the Sun on its side?", ["Mars", "Uranus", "Venus", "Saturn"], 1),
  T("SCIENCE", "Light travels at about…", ["300 km/s", "3,000 km/s", "300,000 km/s", "3 million km/s"], 2),
  T("SCIENCE", "Water freezes at what temperature in Fahrenheit?", ["0°F", "32°F", "50°F", "100°F"], 1),
  T("SCIENCE", "What's the smallest prime number?", ["0", "1", "2", "3"], 2),
  // tech
  T("TECH", "“Pixel” is short for…", ["Picture element", "Pixie cell", "Pick select", "Photo excel"], 0),
  T("TECH", "How many bits are in a byte?", ["4", "8", "16", "32"], 1),
  T("TECH", "What does the “QR” in QR code stand for?", ["Quick Response", "Quality Read", "Quiet Reply", "Quantum Ray"], 0),
  T("TECH", "In which year did the first iPhone come out?", ["2005", "2007", "2009", "2011"], 1),
  T("TECH", "What does “LOL” usually stand for?", ["Lots of love", "Laugh out loud", "Look over left", "Last one left"], 1),
  T("TECH", "The Game Boy first came out in…", ["1985", "1989", "1993", "1997"], 1),
  T("TECH", "What does “HTML” stand for?", ["HyperText Markup Language", "High Tech Modern Language", "Home Tool Make Link", "Hyper Transfer Mail Line"], 0),
  T("TECH", "An emoji is a word that comes from which language?", ["English", "Japanese", "Korean", "Spanish"], 1),
];

/** Small fixed shuffle so the questions don't come in bank order. */
function shuffled<T>(list: T[], seed: number): T[] {
  const a = [...list];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TRIVIA_ORDER = shuffled(TRIVIA, 0x7417a);

export function dayNumber(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 864e5);
}

export const TRIVIA_PER_DAY = 5;

export function triviaFor(day: string = sparkDay()): TriviaQ[] {
  const n = dayNumber(day);
  const start = (n * TRIVIA_PER_DAY) % TRIVIA_ORDER.length;
  return Array.from({ length: TRIVIA_PER_DAY }, (_, i) => TRIVIA_ORDER[(start + i) % TRIVIA_ORDER.length]);
}

export function scoreTrivia(qs: TriviaQ[], answers: number[]): number {
  return qs.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
}

// ------------------------------------------------------------------ This or That
export const THIS_OR_THAT: [string, string][] = [
  ["🌇 Rooftop sunset", "🌃 Midnight city lights"],
  ["🍕 Pizza", "🍔 Burger"],
  ["🐱 Cats", "🐶 Dogs"],
  ["🏖 Beach", "🏔 Mountains"],
  ["🌧 Rainy day", "☀️ Sunny day"],
  ["🎬 Movie night", "🎮 Game night"],
  ["🍵 Tea", "☕ Coffee"],
  ["🐦 Early bird", "🦉 Night owl"],
  ["💬 Texting", "📞 Calling"],
  ["🍬 Sweet", "🥨 Salty"],
  ["🌞 Summer", "❄️ Winter"],
  ["📚 Books", "🎞 Films"],
  ["🚗 Road trip", "✈️ Flight"],
  ["🥞 Breakfast", "🍝 Dinner"],
  ["🍫 Chocolate", "🍦 Vanilla"],
  ["💃 Dance", "🎤 Sing"],
  ["🏙 City", "🌳 Countryside"],
  ["🥞 Pancakes", "🧇 Waffles"],
  ["🍨 Ice cream", "🎂 Cake"],
  ["🧥 Hoodie", "🧣 Big scarf"],
  ["⭐ Stars", "🌙 Moon"],
  ["📺 Binge a series", "🗺 Day out"],
  ["🌶 Spicy", "🥛 Mild"],
  ["🕸 Swing between rooftops", "🕊 Fly like a bird"],
  ["👻 Be invisible", "💪 Be super strong"],
  ["⏪ Visit the past", "⏩ Visit the future"],
  ["🧠 Read minds", "✨ Teleport"],
  ["☃️ Snow day", "🏝 Beach day"],
  ["🌅 Sunrise", "🌇 Sunset"],
  ["🎲 Board games", "🕹 Video games"],
  ["📷 Photos", "🎥 Videos"],
  ["🗓 Plan everything", "🌊 Go with the flow"],
  ["👩‍🍳 Cook together", "🛵 Order in"],
  ["🧺 Picnic", "🍽 Restaurant"],
  ["🎉 Big party", "🛋 Small hangout"],
  ["⛈ Thunderstorm", "🌤 Clear sky"],
  ["🍟 Fries", "🧅 Onion rings"],
  ["🍣 Sushi", "🌮 Tacos"],
  ["🌄 Morning walk", "🌆 Evening walk"],
  ["🎢 Rollercoaster", "🎡 Ferris wheel"],
  ["🐠 Aquarium", "🦒 Zoo"],
  ["🕯 Candles", "✨ Fairy lights"],
  ["✉️ Handwritten letter", "📻 Voice note"],
  ["🎁 Surprise gift", "📝 Wish-list gift"],
  ["🎤 Karaoke", "🎳 Bowling"],
  ["☕ Hot chocolate", "🥤 Milkshake"],
  ["🛌 Pyjama day", "👗 Dress-up day"],
  ["⛺ Camping", "🏨 Hotel"],
  ["🗼 Paris", "🗾 Tokyo"],
  ["🍝 Pasta", "🍚 Rice"],
  ["🌿 Mint", "🍓 Strawberry"],
  ["🪟 Window seat", "🚶 Aisle seat"],
  ["🛁 Bubble bath", "🚿 Long shower"],
  ["🎆 Fireworks", "🌌 Northern lights"],
  ["😂 Comedy", "😱 Horror"],
  ["🐦 Pigeons", "🐦 Seagulls"],
  ["🔴 Red", "🔵 Blue"],
  ["✏️ Doodle", "📝 Write"],
  ["😴 Lie-in", "🚀 Early adventure"],
  ["📼 Old songs", "🆕 New songs"],
  ["🚆 Train", "🚘 Car"],
  ["🛏 Sleepover", "🌃 Night out"],
  ["🍿 Sweet popcorn", "🍿 Salty popcorn"],
  ["🥤 Smoothie", "🧃 Juice"],
  ["🐶 Puppies", "🐱 Kittens"],
  ["🎸 Live music", "🎧 Playlist at home"],
  ["⛄ Snowball fight", "💦 Water fight"],
  ["🤗 Long hug", "😘 Forehead kiss"],
  ["👕 Matching outfits", "📱 Matching phone cases"],
  ["🌮 Street food", "🍷 Fancy dinner"],
  ["🧩 Puzzle", "🎨 Painting"],
  ["🎒 Backpacking", "🛳 Cruise"],
];

export const TOT_PER_DAY = 8;
const TOT_ORDER = shuffled(THIS_OR_THAT, 0x70770);

export function thisOrThatFor(day: string = sparkDay()): [string, string][] {
  const n = dayNumber(day);
  const start = (n * TOT_PER_DAY) % TOT_ORDER.length;
  return Array.from({ length: TOT_PER_DAY }, (_, i) => TOT_ORDER[(start + i) % TOT_ORDER.length]);
}

export function syncPercent(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;
  let same = 0;
  for (let i = 0; i < n; i++) if (a[i] === b[i]) same++;
  return Math.round((same / n) * 100);
}

// ------------------------------------------------------------------ Web Four helpers (mirror the database)
export function web4Winner(board: string): "X" | "O" | "draw" | null {
  const at = (r: number, c: number) => (r < 0 || r > 5 || c < 0 || c > 6 ? "" : board[r * 7 + c]);
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 7; c++) {
      const ch = at(r, c);
      if (ch === "." || !ch) continue;
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
      ])
        if ([1, 2, 3].every((k) => at(r + dr * k, c + dc * k) === ch)) return ch as "X" | "O";
    }
  return board.includes(".") ? null : "draw";
}

export function web4Line(board: string): number[] | null {
  const at = (r: number, c: number) => (r < 0 || r > 5 || c < 0 || c > 6 ? "" : board[r * 7 + c]);
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 7; c++) {
      const ch = at(r, c);
      if (ch === "." || !ch) continue;
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
      ])
        if ([1, 2, 3].every((k) => at(r + dr * k, c + dc * k) === ch)) return [0, 1, 2, 3].map((k) => (r + dr * k) * 7 + c + dc * k);
    }
  return null;
}

/** Monday 00:00 (Europe/London-ish, UTC) of this week, for the weekly scoreboard. */
export function weekStart(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}
