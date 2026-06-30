import type { GameContext, ServerGameModule } from "../types.js";

const QUESTIONS = [
  { q: "What planet is known as the Red Planet?", choices: ["Venus", "Mars", "Jupiter", "Saturn"], answer: 1 },
  { q: "What is the capital of Japan?", choices: ["Seoul", "Beijing", "Tokyo", "Bangkok"], answer: 2 },
  { q: "How many continents are there on Earth?", choices: ["5", "6", "7", "8"], answer: 2 },
  { q: "What is the largest ocean on Earth?", choices: ["Atlantic", "Indian", "Arctic", "Pacific"], answer: 3 },
  { q: "Which element has the chemical symbol 'O'?", choices: ["Gold", "Oxygen", "Osmium", "Iron"], answer: 1 },
  { q: "Who wrote 'Romeo and Juliet'?", choices: ["Dickens", "Shakespeare", "Austen", "Twain"], answer: 1 },
  { q: "What is the smallest prime number?", choices: ["0", "1", "2", "3"], answer: 2 },
  { q: "Which gas do plants primarily absorb?", choices: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], answer: 2 },
];

const ROUND_TIME_MS = 10000;
const TOTAL_ROUNDS = 5;

interface TriviaState {
  roundIndex: number;
  totalRounds: number;
  order: number[];
  question: string;
  choices: string[];
  roundStartedAt: number;
  roundTimeMs: number;
  revealed: boolean;
  correctIndex: number | null;
  answered: Record<string, number | null>; // choice index or null
  scores: Record<string, number>;
}

// Timer handles must never live on the broadcasted state object (see
// colourReflex.ts for why) — kept in side tables instead.
const roundTimers = new Map<string, ReturnType<typeof setTimeout>>();
const nextRoundTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearTimers(lobbyId: string) {
  const t1 = roundTimers.get(lobbyId);
  if (t1) clearTimeout(t1);
  roundTimers.delete(lobbyId);
  const t2 = nextRoundTimers.get(lobbyId);
  if (t2) clearTimeout(t2);
  nextRoundTimers.delete(lobbyId);
}

const trivia: ServerGameModule = {
  id: "trivia",
  name: "Trivia",
  description: "Answer multiple-choice questions. Faster correct answers score more points.",
  icon: "🧩",
  minPlayers: 2,
  maxPlayers: 10,
  estimatedMatchLength: "2 min",

  onStart(ctx) {
    const order = [...QUESTIONS.keys()].sort(() => Math.random() - 0.5).slice(0, TOTAL_ROUNDS);
    const scores: Record<string, number> = {};
    for (const p of ctx.lobby.players) scores[p.id] = 0;
    const state: TriviaState = {
      roundIndex: 0,
      totalRounds: order.length,
      order,
      question: "",
      choices: [],
      roundStartedAt: 0,
      roundTimeMs: ROUND_TIME_MS,
      revealed: false,
      correctIndex: null,
      answered: {},
      scores,
    };
    ctx.setState(state);
    beginRound(ctx);
  },

  onAction(ctx, playerId, action, payload) {
    if (action !== "answer") return;
    const s = ctx.getState<TriviaState>();
    if (s.revealed || s.answered[playerId] !== undefined) return;
    const { choiceIndex } = payload as { choiceIndex: number };
    const question = QUESTIONS[s.order[s.roundIndex]];
    s.answered[playerId] = choiceIndex;
    if (choiceIndex === question.answer) {
      const elapsed = Date.now() - s.roundStartedAt;
      const speedBonus = Math.max(0, ROUND_TIME_MS - elapsed) / ROUND_TIME_MS;
      s.scores[playerId] = (s.scores[playerId] ?? 0) + Math.round(50 + speedBonus * 50);
    }
    ctx.setState(s);
    ctx.emitState();

    const everyoneAnswered = ctx.lobby.players.every((p) => s.answered[p.id] !== undefined);
    if (everyoneAnswered) {
      const timer = roundTimers.get(ctx.lobby.id);
      if (timer) {
        clearTimeout(timer);
        roundTimers.delete(ctx.lobby.id);
        reveal(ctx);
      }
    }
  },

  onPlayerSync(ctx) {
    ctx.emitState();
  },

  onEnd(ctx) {
    clearTimers(ctx.lobby.id);
  },
};

function beginRound(ctx: GameContext) {
  const s = ctx.getState<TriviaState>();
  const question = QUESTIONS[s.order[s.roundIndex]];
  s.question = question.q;
  s.choices = question.choices;
  s.roundStartedAt = Date.now();
  s.revealed = false;
  s.correctIndex = null;
  s.answered = {};
  ctx.setState(s);
  ctx.emitState();

  const timer = setTimeout(() => reveal(ctx), ROUND_TIME_MS);
  roundTimers.set(ctx.lobby.id, timer);
}

function reveal(ctx: GameContext) {
  const s = ctx.getState<TriviaState>();
  const question = QUESTIONS[s.order[s.roundIndex]];
  s.revealed = true;
  s.correctIndex = question.answer;
  ctx.setState(s);
  ctx.emitState();

  const timer = setTimeout(() => advance(ctx), 1500);
  nextRoundTimers.set(ctx.lobby.id, timer);
}

function advance(ctx: GameContext) {
  const s = ctx.getState<TriviaState>();
  s.roundIndex++;
  if (s.roundIndex >= s.order.length) {
    clearTimers(ctx.lobby.id);
    const ranked = ctx.lobby.players
      .map((p) => ({ id: p.id, username: p.username, score: s.scores[p.id] ?? 0 }))
      .sort((a, b) => b.score - a.score);
    ctx.finishMatch({ players: ranked.map((r, i) => ({ ...r, place: i + 1 })) });
    return;
  }
  ctx.setState(s);
  beginRound(ctx);
}

export default trivia;
