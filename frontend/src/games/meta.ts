import type { GameId } from "../types";

export const GAME_META: Record<GameId, { name: string; icon: string }> = {
  "reaction-test": { name: "Reaction Test", icon: "⚡" },
  "typing-race": { name: "Typing Race", icon: "⌨️" },
  "memory-match": { name: "Memory Match", icon: "🧠" },
  "snake-battle": { name: "Snake Battle", icon: "🐍" },
  "pong-duel": { name: "Pong Duel", icon: "🏓" },
  trivia: { name: "Trivia", icon: "🧩" },
  "drawing-guessing": { name: "Drawing & Guessing", icon: "🎨" },
  "click-speed": { name: "Click Speed Challenge", icon: "🖱️" },
  "colour-reflex": { name: "Colour Reflex", icon: "🎯" },
  "maze-escape": { name: "Maze Escape", icon: "🧭" },
};
