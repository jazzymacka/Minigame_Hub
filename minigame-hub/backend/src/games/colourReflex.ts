import type { GameContext, ServerGameModule } from "../types.js";

const COLOURS = [
  { id: "red", hex: "#ef4444" },
  { id: "blue", hex: "#3b82f6" },
  { id: "green", hex: "#22c55e" },
  { id: "yellow", hex: "#eab308" },
  { id: "purple", hex: "#a855f7" },
  { id: "orange", hex: "#f97316" },
  { id: "pink", hex: "#ec4899" },
  { id: "cyan", hex: "#06b6d4" },
];
const TOTAL_ROUNDS = 8;

interface ColourState {
  round: number;
  target: string;
  options: string[];
  roundStartedAt: number;
  roundTimeMs: number;
  answered: Record<string, boolean>;
  scores: Record<string, number>;
  roundTimer: ReturnType<typeof setTimeout> | null;
}

const colourReflex: ServerGameModule = {
  id: "colour-reflex",
  name: "Colour Reflex",
  description: "Click the matching colour before time runs out. Gets harder every round.",
  icon: "🎯",
  minPlayers: 2,
  maxPlayers: 8,
  estimatedMatchLength: "1 min",

  onStart(ctx) {
    const scores: Record<string, number> = {};
    for (const p of ctx.lobby.players) scores[p.id] = 0;
    ctx.setState({ round: 0, target: "", options: [], roundStartedAt: 0, roundTimeMs: 0, answered: {}, scores, roundTimer: null } as ColourState);
    beginRound(ctx);
  },

  onAction(ctx, playerId, action, payload) {
    if (action !== "select") return;
    const s = ctx.getState<ColourState>();
    if (s.answered[playerId]) return;
    s.answered[playerId] = true;
    const { colourId } = payload as { colourId: string };
    if (colourId === s.target) {
      const elapsed = Date.now() - s.roundStartedAt;
      const speedBonus = Math.max(0, s.roundTimeMs - elapsed) / s.roundTimeMs;
      s.scores[playerId] = (s.scores[playerId] ?? 0) + Math.round(30 + speedBonus * 70);
    }
    ctx.setState(s);
    ctx.emitState();

    const everyoneAnswered = ctx.lobby.players.every((p) => s.answered[p.id]);
    if (everyoneAnswered && s.roundTimer) {
      clearTimeout(s.roundTimer);
      s.roundTimer = null;
      ctx.setState(s);
      advance(ctx);
    }
  },

  onEnd(ctx) {
    const s = ctx.getState<ColourState>();
    if (s.roundTimer) clearTimeout(s.roundTimer);
  },
};

function beginRound(ctx: GameContext) {
  const s = ctx.getState<ColourState>();
  const numOptions = Math.min(COLOURS.length, 3 + Math.floor(s.round / 2));
  const roundTimeMs = Math.max(1200, 3000 - s.round * 250);
  const shuffled = [...COLOURS].sort(() => Math.random() - 0.5).slice(0, numOptions);
  const target = shuffled[Math.floor(Math.random() * shuffled.length)].id;

  s.target = target;
  s.options = shuffled.map((c) => c.id);
  s.roundStartedAt = Date.now();
  s.roundTimeMs = roundTimeMs;
  s.answered = {};
  ctx.setState(s);

  ctx.emitToLobby("game:event", {
    type: "colour:round",
    round: s.round,
    totalRounds: TOTAL_ROUNDS,
    target,
    options: shuffled,
    timeMs: roundTimeMs,
  });

  s.roundTimer = setTimeout(() => advance(ctx), roundTimeMs);
}

function advance(ctx: GameContext) {
  const s = ctx.getState<ColourState>();
  ctx.emitToLobby("game:event", { type: "colour:reveal", target: s.target, scores: s.scores });
  s.round++;
  if (s.round >= TOTAL_ROUNDS) {
    const ranked = ctx.lobby.players
      .map((p: any) => ({ id: p.id, username: p.username, score: s.scores[p.id] ?? 0 }))
      .sort((a: any, b: any) => b.score - a.score);
    ctx.finishMatch({ players: ranked.map((r: any, i: number) => ({ ...r, place: i + 1 })) });
    return;
  }
  ctx.setState(s);
  setTimeout(() => beginRound(ctx), 1200);
}

export default colourReflex;
