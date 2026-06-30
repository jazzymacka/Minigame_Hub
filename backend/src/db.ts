import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { GameId, MatchResult, PlayerId } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "minigame-hub.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    avatar_colour TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    lobby_id TEXT NOT NULL,
    finished_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS match_players (
    match_id INTEGER NOT NULL,
    player_id TEXT NOT NULL,
    username TEXT NOT NULL,
    score INTEGER NOT NULL,
    place INTEGER NOT NULL,
    time_ms INTEGER,
    FOREIGN KEY (match_id) REFERENCES matches(id)
  );

  CREATE INDEX IF NOT EXISTS idx_match_players_player ON match_players(player_id);
  CREATE INDEX IF NOT EXISTS idx_matches_game ON matches(game_id);
`);

export function upsertUser(id: PlayerId, username: string, avatarColour: string) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO users (id, username, avatar_colour, created_at, last_seen)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET username = excluded.username,
       avatar_colour = excluded.avatar_colour, last_seen = excluded.last_seen`
  ).run(id, username, avatarColour, now, now);
}

export function touchUser(id: PlayerId) {
  db.prepare(`UPDATE users SET last_seen = ? WHERE id = ?`).run(Date.now(), id);
}

export function getUser(id: PlayerId) {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as
    | { id: string; username: string; avatar_colour: string; created_at: number; last_seen: number }
    | undefined;
}

export function recordMatch(result: MatchResult) {
  const insertMatch = db.prepare(
    `INSERT INTO matches (game_id, lobby_id, finished_at) VALUES (?, ?, ?)`
  );
  const insertPlayer = db.prepare(
    `INSERT INTO match_players (match_id, player_id, username, score, place, time_ms)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const tx = db.transaction(() => {
    const info = insertMatch.run(result.gameId, result.lobbyId, result.finishedAt);
    const matchId = info.lastInsertRowid as number;
    for (const p of result.players) {
      insertPlayer.run(matchId, p.id, p.username, p.score, p.place, p.timeMs ?? null);
    }
    return matchId;
  });
  return tx();
}

export function getGameLeaderboard(gameId: GameId) {
  const wins = db
    .prepare(
      `SELECT mp.player_id as id, mp.username,
              SUM(CASE WHEN mp.place = 1 THEN 1 ELSE 0 END) as wins,
              COUNT(*) as gamesPlayed,
              MIN(CASE WHEN mp.place = 1 THEN mp.time_ms ELSE NULL END) as bestTimeMs
       FROM match_players mp
       JOIN matches m ON m.id = mp.match_id
       WHERE m.game_id = ?
       GROUP BY mp.player_id
       ORDER BY wins DESC, gamesPlayed DESC
       LIMIT 50`
    )
    .all(gameId) as { id: string; username: string; wins: number; gamesPlayed: number; bestTimeMs: number | null }[];

  return wins.map((row) => ({
    ...row,
    winRate: row.gamesPlayed > 0 ? row.wins / row.gamesPlayed : 0,
  }));
}

export function getOverallStats(playerId: PlayerId) {
  const row = db
    .prepare(
      `SELECT COUNT(*) as gamesPlayed,
              SUM(CASE WHEN place = 1 THEN 1 ELSE 0 END) as wins
       FROM match_players WHERE player_id = ?`
    )
    .get(playerId) as { gamesPlayed: number; wins: number };

  const favourite = db
    .prepare(
      `SELECT m.game_id as gameId, COUNT(*) as plays
       FROM match_players mp JOIN matches m ON m.id = mp.match_id
       WHERE mp.player_id = ?
       GROUP BY m.game_id ORDER BY plays DESC LIMIT 1`
    )
    .get(playerId) as { gameId: GameId; plays: number } | undefined;

  const recent = db
    .prepare(
      `SELECT m.game_id as gameId, mp.score, mp.place, m.finished_at as finishedAt
       FROM match_players mp JOIN matches m ON m.id = mp.match_id
       WHERE mp.player_id = ? ORDER BY m.finished_at DESC LIMIT 10`
    )
    .all(playerId);

  return {
    gamesPlayed: row.gamesPlayed ?? 0,
    wins: row.wins ?? 0,
    favouriteGame: favourite?.gameId ?? null,
    recentMatches: recent,
  };
}

export function getGameTotalPlays(gameId: GameId) {
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM matches WHERE game_id = ?`)
    .get(gameId) as { count: number };
  return row.count;
}
