import { Router } from "express";
import { listGameModules } from "../games/index.js";
import { getGameLeaderboard, getGameTotalPlays, getOverallStats } from "../db.js";
import { getOnlinePlayers, lobbies, publicOpenLobbies } from "../state/store.js";
import type { GameId } from "../types.js";

export const apiRouter = Router();

apiRouter.get("/games", (_req, res) => {
  const games = listGameModules().map((g) => {
    const activeLobbies = [...lobbies.values()].filter((l) => l.gameId === g.id && l.status !== "finished");
    const playersInGame = activeLobbies.reduce((sum, l) => sum + l.players.length, 0);
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      icon: g.icon,
      minPlayers: g.minPlayers,
      maxPlayers: g.maxPlayers,
      estimatedMatchLength: g.estimatedMatchLength,
      activeLobbies: activeLobbies.length,
      playersCurrentlyPlaying: playersInGame,
      totalTimesPlayed: getGameTotalPlays(g.id as GameId),
    };
  });
  res.json(games);
});

apiRouter.get("/lobbies/public", (_req, res) => {
  res.json(publicOpenLobbies());
});

apiRouter.get("/users/online", (req, res) => {
  const excluding = req.query.excluding as string | undefined;
  res.json(getOnlinePlayers(excluding).map((s) => ({ id: s.id, username: s.username, avatarColour: s.avatarColour, inLobby: !!s.currentLobbyId })));
});

apiRouter.get("/leaderboard/:gameId", (req, res) => {
  res.json(getGameLeaderboard(req.params.gameId as GameId));
});

apiRouter.get("/profile/:playerId", (req, res) => {
  res.json(getOverallStats(req.params.playerId));
});
