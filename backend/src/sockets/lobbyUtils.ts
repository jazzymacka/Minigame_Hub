import type { Server } from "socket.io";
import { nanoid } from "nanoid";
import type { ChatMessage, Lobby, PlayerId } from "../types.js";
import { lobbies, sessions } from "../state/store.js";
import { getGameModule } from "../games/index.js";

export function serializeLobby(lobby: Lobby) {
  return lobby;
}

export function broadcastLobby(io: Server, lobby: Lobby) {
  io.to(lobby.id).emit("lobby:state", serializeLobby(lobby));
}

export function broadcastPublicLobbies(io: Server) {
  const publicOpen = [...lobbies.values()].filter(
    (l) => l.isPublic && l.status === "waiting" && l.players.length < l.maxPlayers
  );
  io.emit("lobbies:public", publicOpen);
}

export function addSystemMessage(lobby: Lobby, text: string, type: ChatMessage["type"] = "system") {
  lobby.chat.push({ id: nanoid(8), type, text, timestamp: Date.now() });
  if (lobby.chat.length > 200) lobby.chat = lobby.chat.slice(-200);
}

export function removePlayerFromLobby(io: Server, lobby: Lobby, playerId: PlayerId): "disbanded" | "host-changed" | "left" {
  const wasHost = lobby.hostId === playerId;
  const player = lobby.players.find((p) => p.id === playerId);
  lobby.players = lobby.players.filter((p) => p.id !== playerId);
  lobby.spectators = lobby.spectators.filter((id) => id !== playerId);

  const session = sessions.get(playerId);
  if (session) session.currentLobbyId = null;

  if (player) addSystemMessage(lobby, `${player.username} left the lobby.`, "leave");

  if (lobby.players.length === 0) {
    lobbies.delete(lobby.id);
    io.to(lobby.id).emit("lobby:closed", { reason: "empty" });
    broadcastPublicLobbies(io);
    return "disbanded";
  }

  if (wasHost) {
    const newHost = lobby.players[0];
    lobby.hostId = newHost.id;
    newHost.isHost = true;
    addSystemMessage(lobby, `${newHost.username} is now the host.`);
    broadcastLobby(io, lobby);
    broadcastPublicLobbies(io);
    return "host-changed";
  }

  broadcastLobby(io, lobby);
  broadcastPublicLobbies(io);
  return "left";
}

export function lobbyMeetsMinimum(lobby: Lobby): boolean {
  const module = getGameModule(lobby.gameId);
  if (!module) return false;
  return lobby.players.length >= module.minPlayers;
}

export function lobbyAtMaximum(lobby: Lobby): boolean {
  return lobby.players.length >= lobby.maxPlayers;
}
