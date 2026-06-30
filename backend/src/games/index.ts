import type { GameId, ServerGameModule } from "../types.js";
import reactionTest from "./reactionTest.js";
import typingRace from "./typingRace.js";
import memoryMatch from "./memoryMatch.js";
import snakeBattle from "./snakeBattle.js";
import pongDuel from "./pongDuel.js";
import trivia from "./trivia.js";
import drawingGuessing from "./drawingGuessing.js";
import clickSpeed from "./clickSpeed.js";
import colourReflex from "./colourReflex.js";
import mazeEscape from "./mazeEscape.js";

/**
 * ============================================================
 *  ADDING A NEW GAME
 * ============================================================
 * 1. Create backend/src/games/yourGame.ts implementing ServerGameModule
 *    (see types.ts). Export it as default.
 * 2. Import it below and add it to the `modules` array.
 * 3. Create the matching frontend module in
 *    frontend/src/games/yourGame/ (manifest + React component) and
 *    register it in frontend/src/games/registry.ts.
 * That's it — lobbies, matchmaking, chat, invites, leaderboards and
 * the home page all work automatically off this registry.
 * See README.md "Adding a new game" for the full walkthrough.
 * ============================================================
 */
const modules: ServerGameModule[] = [
  reactionTest,
  typingRace,
  memoryMatch,
  snakeBattle,
  pongDuel,
  trivia,
  drawingGuessing,
  clickSpeed,
  colourReflex,
  mazeEscape,
];

export const gameRegistry = new Map<GameId, ServerGameModule>(modules.map((m) => [m.id, m]));

export function getGameModule(id: GameId): ServerGameModule | undefined {
  return gameRegistry.get(id);
}

export function listGameModules(): ServerGameModule[] {
  return modules;
}
