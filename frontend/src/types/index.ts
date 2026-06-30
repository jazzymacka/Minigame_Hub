export type PlayerId = string;
export type LobbyId = string;
export type GameId =
  | "reaction-test"
  | "typing-race"
  | "memory-match"
  | "snake-battle"
  | "pong-duel"
  | "trivia"
  | "drawing-guessing"
  | "click-speed"
  | "colour-reflex"
  | "maze-escape";

export interface GameSummary {
  id: GameId;
  name: string;
  description: string;
  icon: string;
  minPlayers: number;
  maxPlayers: number;
  estimatedMatchLength: string;
  activeLobbies: number;
  playersCurrentlyPlaying: number;
  totalTimesPlayed: number;
}

export interface LobbyPlayer {
  id: PlayerId;
  username: string;
  avatarColour: string;
  ready: boolean;
  isHost: boolean;
  connected: boolean;
}

export interface ChatMessage {
  id: string;
  type: "message" | "join" | "leave" | "system";
  author?: string;
  text: string;
  timestamp: number;
}

export type LobbyStatus = "waiting" | "countdown" | "in-progress" | "finished";

export interface Lobby {
  id: LobbyId;
  name: string;
  gameId: GameId;
  hostId: PlayerId;
  maxPlayers: number;
  isPublic: boolean;
  allowSpectators: boolean;
  status: LobbyStatus;
  players: LobbyPlayer[];
  spectators: PlayerId[];
  chat: ChatMessage[];
  createdAt: number;
}

export interface OnlineUser {
  id: PlayerId;
  username: string;
  avatarColour: string;
  inLobby: boolean;
}

export interface MatchResultPlayer {
  id: PlayerId;
  username: string;
  score: number;
  place: number;
  timeMs?: number;
}

export interface MatchResult {
  gameId: GameId;
  lobbyId: LobbyId;
  players: MatchResultPlayer[];
  finishedAt: number;
}

export interface LeaderboardRow {
  id: PlayerId;
  username: string;
  wins: number;
  gamesPlayed: number;
  bestTimeMs: number | null;
  winRate: number;
}

export interface ProfileStats {
  gamesPlayed: number;
  wins: number;
  favouriteGame: GameId | null;
  recentMatches: { gameId: GameId; score: number; place: number; finishedAt: number }[];
}

export interface InviteReceived {
  inviteId: string;
  fromUsername: string;
  fromPlayerId: string;
  lobbyId: string;
  lobbyName: string;
  gameId: GameId;
}
