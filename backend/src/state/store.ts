import type { Lobby, LobbyId, PlayerId, PlayerSession } from "../types.js";

/**
 * Active, ephemeral state lives in memory (it dies with the server, which is
 * fine for lobbies/sessions). Durable stats live in SQLite (see db.ts).
 */
export const sessions = new Map<PlayerId, PlayerSession>();
export const socketToPlayer = new Map<string, PlayerId>();
export const lobbies = new Map<LobbyId, Lobby>();

export function getOnlinePlayers(excluding?: PlayerId) {
  return [...sessions.values()].filter((s) => s.connected && s.id !== excluding);
}

export function findLobbyOfPlayer(playerId: PlayerId): Lobby | undefined {
  const session = sessions.get(playerId);
  if (!session?.currentLobbyId) return undefined;
  return lobbies.get(session.currentLobbyId);
}

export function publicOpenLobbies(): Lobby[] {
  return [...lobbies.values()].filter(
    (l) => l.isPublic && l.status === "waiting" && l.players.length < l.maxPlayers
  );
}
