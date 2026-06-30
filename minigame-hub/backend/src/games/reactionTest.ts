import type { ServerGameModule } from "../types.js";

interface ReactionState {
  phase: "waiting" | "green" | "done";
  greenAt: number | null;
  results: Record<string, { timeMs: number | null; falseStart: boolean }>;
}

const reactionTest: ServerGameModule = {
  id: "reaction-test",
  name: "Reaction Test",
  description: "Wait for green, then click as fast as you can. Click early and you're disqualified.",
  icon: "⚡",
  minPlayers: 2,
  maxPlayers: 8,
  estimatedMatchLength: "30 sec",

  onStart(ctx) {
    const results: ReactionState["results"] = {};
    for (const p of ctx.lobby.players) results[p.id] = { timeMs: null, falseStart: false };
    const state: ReactionState = { phase: "waiting", greenAt: null, results };
    ctx.setState(state);
    ctx.emitToLobby("game:event", { type: "reaction:waiting" });

    const delay = 2000 + Math.random() * 4000;
    setTimeout(() => {
      const s = ctx.getState<ReactionState>();
      if (s.phase !== "waiting") return;
      s.phase = "green";
      s.greenAt = Date.now();
      ctx.setState(s);
      ctx.emitToLobby("game:event", { type: "reaction:green" });
      ctx.emitState();
    }, delay);
  },

  onAction(ctx, playerId, action) {
    const s = ctx.getState<ReactionState>();
    if (action !== "click" || !s.results[playerId] || s.results[playerId].timeMs !== null) return;

    if (s.phase === "waiting") {
      s.results[playerId] = { timeMs: null, falseStart: true };
    } else if (s.phase === "green" && s.greenAt) {
      s.results[playerId] = { timeMs: Date.now() - s.greenAt, falseStart: false };
    }
    ctx.setState(s);
    ctx.emitState();

    const allDone = ctx.lobby.players.every((p) => s.results[p.id]?.timeMs !== null || s.results[p.id]?.falseStart);
    if (allDone) {
      const ranked = ctx.lobby.players
        .map((p) => ({ id: p.id, username: p.username, entry: s.results[p.id] }))
        .sort((a, b) => {
          if (a.entry.falseStart && !b.entry.falseStart) return 1;
          if (!a.entry.falseStart && b.entry.falseStart) return -1;
          return (a.entry.timeMs ?? Infinity) - (b.entry.timeMs ?? Infinity);
        });
      s.phase = "done";
      ctx.setState(s);
      ctx.finishMatch({
        players: ranked.map((r, i) => ({
          id: r.id,
          username: r.username,
          score: r.entry.falseStart ? 0 : Math.max(0, 1000 - (r.entry.timeMs ?? 1000)),
          place: i + 1,
          timeMs: r.entry.timeMs ?? undefined,
        })),
      });
    }
  },
};

export default reactionTest;
