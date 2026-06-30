import type { Server } from "socket.io";
import type { GameContext, Lobby, MatchResult, PlayerId } from "../types.js";
import { getGameModule } from "../games/index.js";
import { recordMatch } from "../db.js";
import { sessions } from "../state/store.js";

interface ActiveMatch {
  lobbyId: string;
  state: unknown;
  interval: ReturnType<typeof setInterval> | null;
}

const activeMatches = new Map<string, ActiveMatch>();

export function startMatch(io: Server, lobby: Lobby) {
  const module = getGameModule(lobby.gameId);
  if (!module) return;

  const match: ActiveMatch = { lobbyId: lobby.id, state: null, interval: null };
  activeMatches.set(lobby.id, match);

  const ctx = buildContext(io, lobby, match);
  module.onStart(ctx);

  if (module.onTick && module.tickRateMs) {
    match.interval = setInterval(() => module.onTick!(ctx), module.tickRateMs);
  }
}

export function handleGameAction(io: Server, lobby: Lobby, playerId: PlayerId, action: string, payload: unknown) {
  const module = getGameModule(lobby.gameId);
  const match = activeMatches.get(lobby.id);
  if (!module || !match) return;
  const ctx = buildContext(io, lobby, match);
  module.onAction(ctx, playerId, action, payload);
}

export function handlePlayerLeaveMatch(io: Server, lobby: Lobby, playerId: PlayerId) {
  const module = getGameModule(lobby.gameId);
  const match = activeMatches.get(lobby.id);
  if (!module || !match || !module.onPlayerLeave) return;
  const ctx = buildContext(io, lobby, match);
  module.onPlayerLeave(ctx, playerId);
}

/**
 * Re-sends the authoritative match state to a single player. Called when a
 * client mounts its game component (or reconnects) and wants to make sure
 * it didn't miss the original onStart broadcast — this is what makes games
 * resilient to the inherent race between "server emits" and "client finishes
 * subscribing", instead of relying on perfect message timing.
 */
export function resyncPlayer(io: Server, lobby: Lobby, playerId: PlayerId) {
  const module = getGameModule(lobby.gameId);
  const match = activeMatches.get(lobby.id);
  if (!module || !match) return;
  const ctx = buildContext(io, lobby, match);
  ctx.emitToPlayer(playerId, "game:state", match.state);
  module.onPlayerSync?.(ctx, playerId);
}

export function endMatch(lobby: Lobby) {
  const module = getGameModule(lobby.gameId);
  const match = activeMatches.get(lobby.id);
  if (match?.interval) clearInterval(match.interval);
  if (module?.onEnd && match) {
    module.onEnd(buildContext(undefined as unknown as Server, lobby, match));
  }
  activeMatches.delete(lobby.id);
}

function buildContext(io: Server, lobby: Lobby, match: ActiveMatch): GameContext {
  return {
    lobby,
    emitState: () => {
      io?.to(lobby.id).emit("game:state", match.state);
    },
    emitToLobby: (event, payload) => {
      io?.to(lobby.id).emit(event, payload);
    },
    emitToPlayer: (playerId, event, payload) => {
      const session = sessions.get(playerId);
      if (session?.socketId) io?.to(session.socketId).emit(event, payload);
    },
    finishMatch: (result) => {
      const fullResult: MatchResult = {
        gameId: lobby.gameId,
        lobbyId: lobby.id,
        finishedAt: Date.now(),
        ...result,
      };
      try {
        recordMatch(fullResult);
      } catch (err) {
        console.error("Failed to record match result", err);
      }
      lobby.status = "finished";
      io?.to(lobby.id).emit("game:finished", fullResult);
      const m = activeMatches.get(lobby.id);
      if (m?.interval) clearInterval(m.interval);
      const module = getGameModule(lobby.gameId);
      if (module?.onEnd) module.onEnd(buildContext(io, lobby, match));
      activeMatches.delete(lobby.id);
    },
    getState: <T>() => match.state as T,
    setState: (state) => {
      match.state = state;
    },
  };
}
