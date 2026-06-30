import type { GameContext, ServerGameModule } from "../types.js";

const DURATION_MS = 10000;

interface ClickState {
  startedAt: number;
  durationMs: number;
  counts: Record<string, number>;
}

// Timer handles must never live on the broadcasted state object (see
// colourReflex.ts for why) — kept in a side table instead.
const endTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
    const state: ClickState = { startedAt: Date.now(), durationMs: DURATION_MS, counts };
    ctx.setState(state);
    ctx.emitState();
    const timer = setTimeout(() => endMatch(ctx), DURATION_MS);
    endTimers.set(ctx.lobby.id, timer);
  },

  onAction(ctx, playerId, action) {
    if (action !== "click") return;
    const s = ctx.getState<ClickState>();
    if (Date.now() - s.startedAt > s.durationMs) return;
    s.counts[playerId] = (s.counts[playerId] ?? 0) + 1;
    ctx.setState(s);
    ctx.emitState();
  },

  onPlayerSync(ctx) {
    ctx.emitState();
  },

  onEnd(ctx) {
    const timer = endTimers.get(ctx.lobby.id);
    if (timer) clearTimeout(timer);
    endTimers.delete(ctx.lobby.id);
  },
};

function endMatch(ctx: GameContext) {
  const s = ctx.getState<ClickState>();
  const ranked = ctx.lobby.players
    .map((p) => ({ id: p.id, username: p.username, score: s.counts[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
  ctx.finishMatch({ players: ranked.map((r, i) => ({ ...r, place: i + 1 })) });
}

export default clickSpeed;
