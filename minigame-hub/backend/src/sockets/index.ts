import type { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import { lobbies, sessions, socketToPlayer, findLobbyOfPlayer, getOnlinePlayers } from "../state/store.js";
import { upsertUser, touchUser, getUser } from "../db.js";
import { getGameModule } from "../games/index.js";
import {
  addSystemMessage,
  broadcastLobby,
  broadcastPublicLobbies,
  lobbyAtMaximum,
  lobbyMeetsMinimum,
  removePlayerFromLobby,
} from "./lobbyUtils.js";
import { startMatch, handleGameAction, handlePlayerLeaveMatch, endMatch } from "../state/matchRuntime.js";
import type { ChatMessage, GameId, Lobby, LobbyPlayer, PlayerSession } from "../types.js";

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("auth:join", (data: { sessionId?: string; username: string; avatarColour: string }) => {
      const username = (data.username || "Player").slice(0, 20).trim() || "Player";
      const avatarColour = data.avatarColour || "#4F8CFF";
      let playerId = data.sessionId;

      let session: PlayerSession | undefined = playerId ? sessions.get(playerId) : undefined;
      if (!session) {
        playerId = playerId && playerId.length > 0 ? playerId : nanoid(12);
        session = { id: playerId, username, avatarColour, socketId: socket.id, connected: true, currentLobbyId: null };
        sessions.set(playerId, session);
      } else {
        session.username = username;
        session.avatarColour = avatarColour;
        session.socketId = socket.id;
        session.connected = true;
      }

      socketToPlayer.set(socket.id, session.id);
      upsertUser(session.id, session.username, session.avatarColour);
      socket.data.playerId = session.id;

      socket.emit("auth:joined", { playerId: session.id, username: session.username, avatarColour: session.avatarColour });
      io.emit("users:online", getOnlinePlayers());

      // Rejoin lobby room on reconnect.
      const lobby = findLobbyOfPlayer(session.id);
      if (lobby) {
        socket.join(lobby.id);
        const player = lobby.players.find((p) => p.id === session!.id);
        if (player) player.connected = true;
        broadcastLobby(io, lobby);
        socket.emit("lobby:state", lobby);
      }
    });

    socket.on("lobby:create", (data: {
      gameId: GameId; name: string; maxPlayers: number; isPublic: boolean; allowSpectators: boolean;
    }) => {
      const playerId = socket.data.playerId as string | undefined;
      const session = playerId ? sessions.get(playerId) : undefined;
      if (!session) return;
      const module = getGameModule(data.gameId);
      if (!module) return socket.emit("error:toast", { message: "Unknown game." });
      if (session.currentLobbyId) return socket.emit("error:toast", { message: "You're already in a lobby." });

      const lobbyId = nanoid(8);
      const maxPlayers = Math.max(module.minPlayers, Math.min(data.maxPlayers || module.maxPlayers, module.maxPlayers));
      const hostPlayer: LobbyPlayer = {
        id: session.id, username: session.username, avatarColour: session.avatarColour, ready: false, isHost: true, connected: true,
      };
      const lobby: Lobby = {
        id: lobbyId,
        name: (data.name || `${session.username}'s Lobby`).slice(0, 40),
        gameId: data.gameId,
        hostId: session.id,
        maxPlayers,
        isPublic: data.isPublic ?? true,
        allowSpectators: !!data.allowSpectators,
        status: "waiting",
        players: [hostPlayer],
        spectators: [],
        chat: [],
        createdAt: Date.now(),
      };
      addSystemMessage(lobby, `${session.username} created the lobby.`);
      lobbies.set(lobbyId, lobby);
      session.currentLobbyId = lobbyId;
      socket.join(lobbyId);
      socket.emit("lobby:state", lobby);
      broadcastPublicLobbies(io);
    });

    socket.on("lobby:join", (data: { lobbyId: string }) => {
      const playerId = socket.data.playerId as string | undefined;
      const session = playerId ? sessions.get(playerId) : undefined;
      if (!session) return;
      const lobby = lobbies.get(data.lobbyId);
      if (!lobby) return socket.emit("error:toast", { message: "That lobby no longer exists." });
      if (session.currentLobbyId === lobby.id) {
        socket.join(lobby.id);
        return socket.emit("lobby:state", lobby);
      }
      if (session.currentLobbyId) return socket.emit("error:toast", { message: "Leave your current lobby first." });
      if (lobby.status !== "waiting") return socket.emit("error:toast", { message: "That game already started." });
      if (lobbyAtMaximum(lobby)) return socket.emit("error:toast", { message: "Lobby is full." });

      lobby.players.push({ id: session.id, username: session.username, avatarColour: session.avatarColour, ready: false, isHost: false, connected: true });
      session.currentLobbyId = lobby.id;
      addSystemMessage(lobby, `${session.username} joined the lobby.`, "join");
      socket.join(lobby.id);
      broadcastLobby(io, lobby);
      broadcastPublicLobbies(io);
    });

    socket.on("lobby:leave", () => {
      const playerId = socket.data.playerId as string | undefined;
      if (!playerId) return;
      const lobby = findLobbyOfPlayer(playerId);
      if (!lobby) return;
      socket.leave(lobby.id);
      removePlayerFromLobby(io, lobby, playerId);
    });

    socket.on("lobby:ready", (data: { ready: boolean }) => {
      const playerId = socket.data.playerId as string | undefined;
      if (!playerId) return;
      const lobby = findLobbyOfPlayer(playerId);
      if (!lobby) return;
      const player = lobby.players.find((p) => p.id === playerId);
      if (!player) return;
      player.ready = data.ready;
      broadcastLobby(io, lobby);
    });

    socket.on("lobby:kick", (data: { playerId: string }) => {
      const hostId = socket.data.playerId as string | undefined;
      if (!hostId) return;
      const lobby = findLobbyOfPlayer(hostId);
      if (!lobby || lobby.hostId !== hostId || data.playerId === hostId) return;
      const targetSession = sessions.get(data.playerId);
      const targetSocketId = targetSession?.socketId;
      removePlayerFromLobby(io, lobby, data.playerId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("lobby:kicked", { lobbyId: lobby.id });
        io.sockets.sockets.get(targetSocketId)?.leave(lobby.id);
      }
    });

    socket.on("lobby:chat", (data: { text: string }) => {
      const playerId = socket.data.playerId as string | undefined;
      if (!playerId) return;
      const lobby = findLobbyOfPlayer(playerId);
      if (!lobby) return;
      const text = (data.text || "").slice(0, 280).trim();
      if (!text) return;
      const player = lobby.players.find((p) => p.id === playerId);
      const message: ChatMessage = { id: nanoid(8), type: "message", author: player?.username ?? "Unknown", text, timestamp: Date.now() };
      lobby.chat.push(message);
      io.to(lobby.id).emit("lobby:chatMessage", message);
    });

    socket.on("lobby:invite", (data: { toPlayerId: string }) => {
      const playerId = socket.data.playerId as string | undefined;
      if (!playerId) return;
      const lobby = findLobbyOfPlayer(playerId);
      const fromSession = sessions.get(playerId);
      if (!lobby || !fromSession) return;
      const target = sessions.get(data.toPlayerId);
      if (!target?.socketId || !target.connected) return;
      io.to(target.socketId).emit("invite:received", {
        inviteId: nanoid(8),
        fromUsername: fromSession.username,
        fromPlayerId: fromSession.id,
        lobbyId: lobby.id,
        lobbyName: lobby.name,
        gameId: lobby.gameId,
      });
    });

    socket.on("lobby:start", () => {
      const hostId = socket.data.playerId as string | undefined;
      if (!hostId) return;
      const lobby = findLobbyOfPlayer(hostId);
      if (!lobby || lobby.hostId !== hostId || lobby.status !== "waiting") return;
      if (!lobbyMeetsMinimum(lobby)) return socket.emit("error:toast", { message: "Not enough players yet." });

      lobby.status = "countdown";
      broadcastLobby(io, lobby);
      broadcastPublicLobbies(io);
      io.to(lobby.id).emit("countdown:start", { seconds: 3 });

      setTimeout(() => {
        const current = lobbies.get(lobby.id);
        if (!current || current.status !== "countdown") return;
        current.status = "in-progress";
        broadcastLobby(io, current);
        startMatch(io, current);
      }, 3300);
    });

    socket.on("game:action", (data: { action: string; payload: unknown }) => {
      const playerId = socket.data.playerId as string | undefined;
      if (!playerId) return;
      const lobby = findLobbyOfPlayer(playerId);
      if (!lobby || lobby.status !== "in-progress") return;
      handleGameAction(io, lobby, playerId, data.action, data.payload);
    });

    socket.on("lobby:rematch", () => {
      const playerId = socket.data.playerId as string | undefined;
      if (!playerId) return;
      const lobby = findLobbyOfPlayer(playerId);
      if (!lobby || lobby.hostId !== playerId) return;
      lobby.status = "waiting";
      for (const p of lobby.players) p.ready = false;
      addSystemMessage(lobby, "Lobby reset for a rematch.");
      broadcastLobby(io, lobby);
      broadcastPublicLobbies(io);
    });

    socket.on("disconnect", () => {
      const playerId = socketToPlayer.get(socket.id);
      socketToPlayer.delete(socket.id);
      if (!playerId) return;
      const session = sessions.get(playerId);
      if (session) {
        session.connected = false;
        session.socketId = null;
        touchUser(playerId);
      }
      io.emit("users:online", getOnlinePlayers());

      const lobby = findLobbyOfPlayer(playerId);
      if (lobby) {
        const player = lobby.players.find((p) => p.id === playerId);
        if (player) player.connected = false;
        if (lobby.status === "in-progress") {
          handlePlayerLeaveMatch(io, lobby, playerId);
        }
        broadcastLobby(io, lobby);
        // Give the player a short grace period to reconnect before removing them
        // from a lobby that hasn't started yet.
        if (lobby.status === "waiting") {
          setTimeout(() => {
            const stillThere = lobbies.get(lobby.id);
            const stillDisconnected = stillThere?.players.find((p) => p.id === playerId && !p.connected);
            if (stillThere && stillDisconnected) {
              removePlayerFromLobby(io, stillThere, playerId);
            }
          }, 15000);
        }
      }
    });
  });
}

// Re-export for index.ts convenience.
export { endMatch };
