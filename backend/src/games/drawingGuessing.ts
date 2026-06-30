import type { GameContext, ServerGameModule } from "../types.js";

const WORDS = ["guitar", "elephant", "rainbow", "castle", "rocket", "sandwich", "octopus", "volcano", "bicycle", "penguin"];
const ROUND_TIME_MS = 60000;

interface DrawState {
  round: number;
  artistOrder: string[];
  artistId: string;
  word: string;
  correctGuessers: string[];
  scores: Record<string, number>;
  roundStartedAt: number;
  roundTimer: ReturnType<typeof setTimeout> | null;
}

const drawingGuessing: ServerGameModule = {
  id: "drawing-guessing",
  name: "Drawing & Guessing",
  description: "One player draws, everyone else guesses. The artist rotates every round.",
  icon: "🎨",
  minPlayers: 3,
  maxPlayers: 8,
  estimatedMatchLength: "3-5 min",

  onStart(ctx) {
    const order = ctx.lobby.players.map((p) => p.id).sort(() => Math.random() - 0.5);
    const scores: Record<string, number> = {};
    for (const p of ctx.lobby.players) scores[p.id] = 0;
    const state: DrawState = { round: 0, artistOrder: order, artistId: order[0], word: "", correctGuessers: [], scores, roundStartedAt: 0, roundTimer: null };
    ctx.setState(state);
    beginRound(ctx);
  },

  onAction(ctx, playerId, action, payload) {
    const s = ctx.getState<DrawState>();
    if (action === "stroke" && playerId === s.artistId) {
      ctx.emitToLobby("game:event", { type: "draw:stroke", stroke: payload });
      return;
    }
    if (action === "guess" && playerId !== s.artistId && !s.correctGuessers.includes(playerId)) {
      const { text } = payload as { text: string };
      ctx.emitToLobby("game:event", { type: "draw:chatGuess", playerId, text, correct: false });
      if (text.trim().toLowerCase() === s.word.toLowerCase()) {
        s.correctGuessers.push(playerId);
        const elapsed = Date.now() - s.roundStartedAt;
        const speedBonus = Math.max(0, ROUND_TIME_MS - elapsed) / ROUND_TIME_MS;
        s.scores[playerId] = (s.scores[playerId] ?? 0) + Math.round(50 + speedBonus * 100);
        s.scores[s.artistId] = (s.scores[s.artistId] ?? 0) + 10;
        ctx.setState(s);
        ctx.emitToLobby("game:event", { type: "draw:correctGuess", playerId });
        ctx.emitState();

        const guessersNeeded = ctx.lobby.players.length - 1;
        if (s.correctGuessers.length >= guessersNeeded && s.roundTimer) {
          clearTimeout(s.roundTimer);
          s.roundTimer = null;
          ctx.setState(s);
          endRound(ctx);
        }
      }
    }
  },

  onEnd(ctx) {
    const s = ctx.getState<DrawState>();
    if (s.roundTimer) clearTimeout(s.roundTimer);
  },
};

function beginRound(ctx: GameContext) {
  const s = ctx.getState<DrawState>();
  s.artistId = s.artistOrder[s.round];
  s.word = WORDS[Math.floor(Math.random() * WORDS.length)];
  s.correctGuessers = [];
  s.roundStartedAt = Date.now();
  ctx.setState(s);

  ctx.emitToLobby("game:event", { type: "draw:roundStart", round: s.round, totalRounds: s.artistOrder.length, artistId: s.artistId, timeMs: ROUND_TIME_MS });
  // Word is only revealed to the artist via a private event.
  ctx.emitToPlayer(s.artistId, "game:event", { type: "draw:yourWord", word: s.word });

  s.roundTimer = setTimeout(() => endRound(ctx), ROUND_TIME_MS);
}

function endRound(ctx: GameContext) {
  const s = ctx.getState<DrawState>();
  ctx.emitToLobby("game:event", { type: "draw:roundEnd", word: s.word, scores: s.scores });
  s.round++;
  if (s.round >= s.artistOrder.length) {
    const ranked = ctx.lobby.players
      .map((p: any) => ({ id: p.id, username: p.username, score: s.scores[p.id] ?? 0 }))
      .sort((a: any, b: any) => b.score - a.score);
    ctx.finishMatch({ players: ranked.map((r: any, i: number) => ({ ...r, place: i + 1 })) });
    return;
  }
  ctx.setState(s);
  setTimeout(() => beginRound(ctx), 3000);
}

export default drawingGuessing;
