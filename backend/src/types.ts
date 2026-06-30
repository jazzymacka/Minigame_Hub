// Core shared types for the backend. Mirrors (loosely) frontend/src/types.

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

export interface PlayerSession {
  id: PlayerId;
  username: string;
  avatarColour: string;
  socketId: string | null;
  connected: boolean;
  currentLobbyId: LobbyId | null;
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
  gameState?: unknown;
}

export interface MatchResult {
  gameId: GameId;
  lobbyId: LobbyId;
  players: { id: PlayerId; username: string; score: number; place: number; timeMs?: number }[];
  finishedAt: number;
}

/**
 * Interface every game module on the server must implement.
 * Keeping this small and generic is what lets new games slot in
 * without touching socket/lobby/db code.
 */
export interface ServerGameModule {
  id: GameId;
  name: string;
  description: string;
  icon: string; // emoji or icon key, kept simple for both ends
  minPlayers: number;
  maxPlayers: number;
  estimatedMatchLength: string; // e.g. "1-2 min"
  defaultLobbySettings?: Record<string, unknown>;

  /** Called once when the countdown finishes and the match begins. */
  onStart(ctx: GameContext): void;

  /** Called whenever a player sends a game-specific action. */
  onAction(ctx: GameContext, playerId: PlayerId, action: string, payload: unknown): void;

  /** Called when a player disconnects/leaves mid-match. */
  onPlayerLeave?(ctx: GameContext, playerId: PlayerId): void;

  /**
   * Called when a client explicitly asks to resync (e.g. it mounted after
   * missing the initial onStart broadcast, or reconnected mid-match).
   * Most games don't need this — ctx.getState() is already resent
   * automatically. Implement this only if a player needs something
   * beyond the shared state (e.g. a private word only they should see).
   */
  onPlayerSync?(ctx: GameContext, playerId: PlayerId): void;

  /** Optional fixed-rate server tick for simulation-based games (snake, pong). */
  tickRateMs?: number;
  onTick?(ctx: GameContext): void;

  /** Clean up any intervals/timeouts owned by this match. */
  onEnd?(ctx: GameContext): void;
}

export interface GameContext {
  lobby: Lobby;
  emitState: () => void;
  emitToLobby: (event: string, payload: unknown) => void;
  emitToPlayer: (playerId: PlayerId, event: string, payload: unknown) => void;
  finishMatch: (result: Omit<MatchResult, "gameId" | "lobbyId" | "finishedAt">) => void;
  getState: <T>() => T;
  setState: (state: unknown) => void;
}
