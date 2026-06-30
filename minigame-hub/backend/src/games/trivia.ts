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
  order: number[];
  roundStartedAt: number;
  answered: Record<string, number | null>; // choice index or null
  scores: Record<string, number>;
  roundTimer: ReturnType<typeof setTimeout> | null;
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
    const state: TriviaState = { roundIndex: 0, order, roundStartedAt: 0, answered: {}, scores, roundTimer: null };
    ctx.setState(state);
    beginRound(ctx);
  },

  onAction(ctx, playerId, action, payload) {
    if (action !== "answer") return;
    const s = ctx.getState<TriviaState>();
    if (s.answered[playerId] !== undefined && s.answered[playerId] !== null) return;
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

    const everyoneAnswered = ctx.lobby.players.every((p) => s.answered[p.id] !== null && s.answered[p.id] !== undefined);
    if (everyoneAnswered && s.roundTimer) {
      clearTimeout(s.roundTimer);
      s.roundTimer = null;
      ctx.setState(s);
      advance(ctx);
    }
  },

  onEnd(ctx) {
    const s = ctx.getState<TriviaState>();
    if (s.roundTimer) clearTimeout(s.roundTimer);
  },
};

function beginRound(ctx: GameContext) {
  const s = ctx.getState<TriviaState>();
  s.roundStartedAt = Date.now();
  s.answered = {};
  for (const p of ctx.lobby.players) s.answered[p.id] = null;
  ctx.setState(s);
  const question = QUESTIONS[s.order[s.roundIndex]];
  ctx.emitToLobby("game:event", {
    type: "trivia:round",
    roundIndex: s.roundIndex,
    totalRounds: s.order.length,
    question: question.q,
    choices: question.choices,
    timeMs: ROUND_TIME_MS,
  });
  s.roundTimer = setTimeout(() => {
    const cur = ctx.getState<TriviaState>();
    ctx.emitToLobby("game:event", { type: "trivia:reveal", correct: QUESTIONS[cur.order[cur.roundIndex]].answer, scores: cur.scores });
    advance(ctx);
  }, ROUND_TIME_MS);
}

function advance(ctx: GameContext) {
  const s = ctx.getState<TriviaState>();
  s.roundIndex++;
  if (s.roundIndex >= s.order.length) {
    const ranked = ctx.lobby.players
      .map((p: any) => ({ id: p.id, username: p.username, score: s.scores[p.id] ?? 0 }))
      .sort((a: any, b: any) => b.score - a.score);
    ctx.finishMatch({ players: ranked.map((r: any, i: number) => ({ ...r, place: i + 1 })) });
    return;
  }
  ctx.setState(s);
  setTimeout(() => beginRound(ctx), 1500);
}

export default trivia;
