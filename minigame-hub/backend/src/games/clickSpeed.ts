import type { GameContext, ServerGameModule } from "../types.js";

const DURATION_MS = 10000;

interface ClickState {
  startedAt: number;
  counts: Record<string, number>;
  endTimer: ReturnType<typeof setTimeout> | null;
}

const clickSpeed: ServerGameModule = {
  id: "click-speed",
  name: "Click Speed Challenge",
  description: "Click as fast as you can for 10 seconds. Highest click count wins.",
  icon: "🖱️",
  minPlayers: 2,
  maxPlayers: 10,
  estimatedMatchLength: "15 sec",

  onStart(ctx) {
    const counts: Record<string, number> = {};
    for (const p of ctx.lobby.players) counts[p.id] = 0;
    const state: ClickState = { startedAt: Date.now(), counts, endTimer: null };
    ctx.setState(state);
    ctx.emitToLobby("game:event", { type: "click:start", durationMs: DURATION_MS });
    state.endTimer = setTimeout(() => endMatch(ctx), DURATION_MS);
  },

  onAction(ctx, playerId, action) {
    if (action !== "click") return;
    const s = ctx.getState<ClickState>();
    if (Date.now() - s.startedAt > DURATION_MS) return;
    s.counts[playerId] = (s.counts[playerId] ?? 0) + 1;
    ctx.setState(s);
    ctx.emitState();
  },

  onEnd(ctx) {
    const s = ctx.getState<ClickState>();
    if (s.endTimer) clearTimeout(s.endTimer);
  },
};

function endMatch(ctx: GameContext) {
  const s = ctx.getState<ClickState>();
  const ranked = ctx.lobby.players
    .map((p: any) => ({ id: p.id, username: p.username, score: s.counts[p.id] ?? 0 }))
    .sort((a: any, b: any) => b.score - a.score);
  ctx.finishMatch({ players: ranked.map((r: any, i: number) => ({ ...r, place: i + 1 })) });
}

export default clickSpeed;
