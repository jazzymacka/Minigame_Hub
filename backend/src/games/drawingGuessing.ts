import type { GameContext, ServerGameModule } from "../types.js";

const WORDS = ["guitar", "elephant", "rainbow", "castle", "rocket", "sandwich", "octopus", "volcano", "bicycle", "penguin"];
const ROUND_TIME_MS = 60000;
const MAX_STROKES_KEPT = 2000;

interface Stroke {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface DrawState {
  round: number;
  totalRounds: number;
  artistOrder: string[];
  artistId: string;
  correctGuessers: string[];
  scores: Record<string, number>;
  roundStartedAt: number;
  roundTimeMs: number;
  strokes: Stroke[]; // so a late-joining/resyncing client can redraw the board
  lastRevealedWord: string | null;
}

// Timer handles must never live on the broadcasted state object (see
// colourReflex.ts for why) — kept in side tables instead. The secret word
// is kept here too (never broadcast to the whole lobby, only to the artist).
const roundTimers = new Map<string, ReturnType<typeof setTimeout>>();
const nextRoundTimers = new Map<string, ReturnType<typeof setTimeout>>();
const secretWords = new Map<string, string>();

function clearTimers(lobbyId: string) {
  const t1 = roundTimers.get(lobbyId);
  if (t1) clearTimeout(t1);
  roundTimers.delete(lobbyId);
  const t2 = nextRoundTimers.get(lobbyId);
  if (t2) clearTimeout(t2);
  nextRoundTimers.delete(lobbyId);
  secretWords.delete(lobbyId);
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
    const state: DrawState = {
      round: 0,
      totalRounds: order.length,
      artistOrder: order,
      artistId: order[0],
      correctGuessers: [],
      scores,
      roundStartedAt: 0,
      roundTimeMs: ROUND_TIME_MS,
      strokes: [],
      lastRevealedWord: null,
    };
    ctx.setState(state);
    beginRound(ctx);
  },

  onAction(ctx, playerId, action, payload) {
    const s = ctx.getState<DrawState>();
    if (action === "stroke" && playerId === s.artistId) {
      const stroke = payload as Stroke;
      s.strokes.push(stroke);
      if (s.strokes.length > MAX_STROKES_KEPT) s.strokes = s.strokes.slice(-MAX_STROKES_KEPT);
      ctx.setState(s);
      ctx.emitToLobby("game:event", { type: "draw:stroke", stroke });
      return;
    }
    if (action === "guess" && playerId !== s.artistId && !s.correctGuessers.includes(playerId)) {
      const { text } = payload as { text: string };
      const word = secretWords.get(ctx.lobby.id) ?? "";
      ctx.emitToLobby("game:event", { type: "draw:chatGuess", playerId, text });

      if (word && text.trim().toLowerCase() === word.toLowerCase()) {
        s.correctGuessers.push(playerId);
        const elapsed = Date.now() - s.roundStartedAt;
        const speedBonus = Math.max(0, ROUND_TIME_MS - elapsed) / ROUND_TIME_MS;
        s.scores[playerId] = (s.scores[playerId] ?? 0) + Math.round(50 + speedBonus * 100);
        s.scores[s.artistId] = (s.scores[s.artistId] ?? 0) + 10;
        ctx.setState(s);
        ctx.emitToLobby("game:event", { type: "draw:correctGuess", playerId });
        ctx.emitState();

        const guessersNeeded = ctx.lobby.players.length - 1;
        if (s.correctGuessers.length >= guessersNeeded) {
          const timer = roundTimers.get(ctx.lobby.id);
          if (timer) {
            clearTimeout(timer);
            roundTimers.delete(ctx.lobby.id);
            endRound(ctx);
          }
        }
      }
    }
  },

  onPlayerSync(ctx, playerId) {
    ctx.emitState();
    const s = ctx.getState<DrawState>();
    if (playerId === s.artistId) {
      const word = secretWords.get(ctx.lobby.id);
      if (word) ctx.emitToPlayer(playerId, "game:event", { type: "draw:yourWord", word });
    }
  },

  onEnd(ctx) {
    clearTimers(ctx.lobby.id);
  },
};

function beginRound(ctx: GameContext) {
  const s = ctx.getState<DrawState>();
  s.artistId = s.artistOrder[s.round];
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  secretWords.set(ctx.lobby.id, word);
  s.correctGuessers = [];
  s.roundStartedAt = Date.now();
  s.strokes = [];
  s.lastRevealedWord = null;
  ctx.setState(s);
  ctx.emitState();

  ctx.emitToPlayer(s.artistId, "game:event", { type: "draw:yourWord", word });

  const timer = setTimeout(() => endRound(ctx), ROUND_TIME_MS);
  roundTimers.set(ctx.lobby.id, timer);
}

function endRound(ctx: GameContext) {
  const s = ctx.getState<DrawState>();
  const word = secretWords.get(ctx.lobby.id) ?? "";
  s.lastRevealedWord = word;
  ctx.setState(s);
  ctx.emitState();
  ctx.emitToLobby("game:event", { type: "draw:roundEnd", word });

  s.round++;
  if (s.round >= s.artistOrder.length) {
    clearTimers(ctx.lobby.id);
    const ranked = ctx.lobby.players
      .map((p) => ({ id: p.id, username: p.username, score: s.scores[p.id] ?? 0 }))
      .sort((a, b) => b.score - a.score);
    ctx.finishMatch({ players: ranked.map((r, i) => ({ ...r, place: i + 1 })) });
    return;
  }
  ctx.setState(s);
  const timer = setTimeout(() => beginRound(ctx), 3000);
  nextRoundTimers.set(ctx.lobby.id, timer);
}

export default drawingGuessing;
