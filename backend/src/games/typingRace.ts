import type { ServerGameModule } from "../types.js";

const PARAGRAPHS = [
  "The quick brown fox jumps over the lazy dog while the sun sets behind the distant mountains.",
  "Programming is the art of telling another human what one wants the computer to do, clearly and precisely.",
  "A journey of a thousand miles begins with a single step, taken with patience and quiet determination.",
  "The old lighthouse stood against the storm, its beam cutting through the darkness like a steady promise.",
  "Practice does not make perfect, but consistent practice makes the impossible feel merely difficult instead.",
];

interface TypingState {
  text: string;
  startedAt: number;
  finished: Record<string, { wpm: number; accuracy: number; timeMs: number } | null>;
  progress: Record<string, number>;
}

const typingRace: ServerGameModule = {
  id: "typing-race",
  name: "Typing Race",
  description: "Type the paragraph as fast and accurately as you can.",
  icon: "⌨️",
  minPlayers: 2,
  maxPlayers: 8,
  estimatedMatchLength: "1-2 min",

  onStart(ctx) {
    const text = PARAGRAPHS[Math.floor(Math.random() * PARAGRAPHS.length)];
    const finished: TypingState["finished"] = {};
    const progress: TypingState["progress"] = {};
    for (const p of ctx.lobby.players) {
      finished[p.id] = null;
      progress[p.id] = 0;
    }
    const state: TypingState = { text, startedAt: Date.now(), finished, progress };
    ctx.setState(state);
    ctx.emitToLobby("game:event", { type: "typing:start", text });
  },

  onAction(ctx, playerId, action, payload) {
    const s = ctx.getState<TypingState>();
    if (action === "progress") {
      const p = payload as { charsTyped: number };
      s.progress[playerId] = Math.min(1, p.charsTyped / s.text.length);
      ctx.setState(s);
      ctx.emitState();
      return;
    }
    if (action === "finish" && s.finished[playerId] === null) {
      const p = payload as { wpm: number; accuracy: number; timeMs: number };
      const wpm = Math.max(0, Math.min(400, p.wpm));
      const accuracy = Math.max(0, Math.min(1, p.accuracy));
      s.finished[playerId] = { wpm, accuracy, timeMs: p.timeMs };
      s.progress[playerId] = 1;
      ctx.setState(s);
      ctx.emitState();

      const allDone = ctx.lobby.players.every((pl) => s.finished[pl.id] !== null);
      if (allDone) {
        const ranked = ctx.lobby.players
          .map((pl) => ({ id: pl.id, username: pl.username, r: s.finished[pl.id]! }))
          .sort((a, b) => b.r.wpm * b.r.accuracy - a.r.wpm * a.r.accuracy);
        ctx.finishMatch({
          players: ranked.map((r, i) => ({
            id: r.id,
            username: r.username,
            score: Math.round(r.r.wpm * r.r.accuracy),
            place: i + 1,
            timeMs: r.r.timeMs,
          })),
        });
      }
    }
  },
};

export default typingRace;
