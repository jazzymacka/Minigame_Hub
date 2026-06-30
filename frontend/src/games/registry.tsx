import type { ComponentType } from "react";
import type { GameId, Lobby } from "../types";
import ReactionTest from "./reactionTest/ReactionTest";
import TypingRace from "./typingRace/TypingRace";
import MemoryMatch from "./memoryMatch/MemoryMatch";
import SnakeBattle from "./snakeBattle/SnakeBattle";
import PongDuel from "./pongDuel/PongDuel";
import Trivia from "./trivia/Trivia";
import DrawingGuessing from "./drawingGuessing/DrawingGuessing";
import ClickSpeed from "./clickSpeed/ClickSpeed";
import ColourReflex from "./colourReflex/ColourReflex";
import MazeEscape from "./mazeEscape/MazeEscape";

export interface GameComponentProps {
  lobby: Lobby;
  playerId: string;
}

/**
 * ============================================================
 *  ADDING A NEW GAME (frontend half — see backend/src/games/index.ts
 *  for the server half)
 * ============================================================
 * 1. Create frontend/src/games/yourGame/YourGame.tsx. It receives
 *    { lobby, playerId } and is responsible for everything that
 *    happens once a match is "in-progress": rendering the board,
 *    sending socket.emit("game:action", { action, payload }), and
 *    listening to "game:state" / "game:event" for updates.
 * 2. Add the matching entry to GAME_META in games/meta.ts (name + icon
 *    shown on Profile/leaderboards before live API data loads).
 * 3. Import it below and add it to the registry map.
 * The Lobby page, results screen, chat, invites, and leaderboards
 * all work automatically — they only ever talk to the registry by
 * GameId, never to a specific game's internals.
 * ============================================================
 */
export const GAME_REGISTRY: Record<GameId, ComponentType<GameComponentProps>> = {
  "reaction-test": ReactionTest,
  "typing-race": TypingRace,
  "memory-match": MemoryMatch,
  "snake-battle": SnakeBattle,
  "pong-duel": PongDuel,
  trivia: Trivia,
  "drawing-guessing": DrawingGuessing,
  "click-speed": ClickSpeed,
  "colour-reflex": ColourReflex,
  "maze-escape": MazeEscape,
};
