import type { GameContext, ServerGameModule } from "../types.js";

const SIZE = 15; // odd number works best for maze generation

type Cell = { walls: { n: boolean; s: boolean; e: boolean; w: boolean } };

function generateMaze(size: number): Cell[][] {
  const grid: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ walls: { n: true, s: true, e: true, w: true } }))
  );
  const visited = Array.from({ length: size }, () => new Array(size).fill(false));

  function carve(x: number, y: number) {
    visited[y][x] = true;
    const dirs = [
      ["n", 0, -1], ["s", 0, 1], ["e", 1, 0], ["w", -1, 0],
    ] as const;
    const shuffled = [...dirs].sort(() => Math.random() - 0.5);
    for (const [dir, dx, dy] of shuffled) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size || visited[ny][nx]) continue;
      grid[y][x].walls[dir] = false;
      const opposite = { n: "s", s: "n", e: "w", w: "e" } as const;
      grid[ny][nx].walls[opposite[dir]] = false;
      carve(nx, ny);
    }
  }
  carve(0, 0);
  return grid;
}

interface MazeState {
  size: number;
  maze: Cell[][];
  positions: Record<string, [number, number]>;
  finishedOrder: string[];
  startedAt: number;
}

const moveDelta: Record<string, [number, number, "n" | "s" | "e" | "w"]> = {
  up: [0, -1, "n"],
  down: [0, 1, "s"],
  left: [-1, 0, "w"],
  right: [1, 0, "e"],
};

const mazeEscape: ServerGameModule = {
  id: "maze-escape",
  name: "Maze Escape",
  description: "A fresh maze every match. Race everyone else to the exit.",
  icon: "🧭",
  minPlayers: 2,
  maxPlayers: 8,
  estimatedMatchLength: "1-3 min",

  onStart(ctx) {
    const maze = generateMaze(SIZE);
    const positions: Record<string, [number, number]> = {};
    for (const p of ctx.lobby.players) positions[p.id] = [0, 0];
    const state: MazeState = { size: SIZE, maze, positions, finishedOrder: [], startedAt: Date.now() };
    ctx.setState(state);
    ctx.emitToLobby("game:event", { type: "maze:start", size: SIZE, maze, exit: [SIZE - 1, SIZE - 1] });
  },

  onAction(ctx, playerId, action, payload) {
    if (action !== "move") return;
    const s = ctx.getState<MazeState>();
    if (s.finishedOrder.includes(playerId)) return;
    const { dir } = payload as { dir: "up" | "down" | "left" | "right" };
    const move = moveDelta[dir];
    if (!move) return;
    const [dx, dy, wallKey] = move;
    const [x, y] = s.positions[playerId];
    if (s.maze[y][x].walls[wallKey]) return; // blocked by a wall, ignore
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= s.size || ny >= s.size) return;
    s.positions[playerId] = [nx, ny];

    if (nx === s.size - 1 && ny === s.size - 1) {
      s.finishedOrder.push(playerId);
    }
    ctx.setState(s);
    ctx.emitState();

    const allFinished = s.finishedOrder.length === ctx.lobby.players.length;
    if (allFinished) finish(ctx);
  },

  onPlayerLeave(ctx, playerId) {
    const s = ctx.getState<MazeState>();
    if (!s.finishedOrder.includes(playerId)) {
      // Leaving counts as not finishing; handled naturally by finish() ordering.
    }
    ctx.setState(s);
  },
};

function finish(ctx: GameContext) {
  const s = ctx.getState<MazeState>();
  const finishTimes: Record<string, number> = {};
  s.finishedOrder.forEach((id: string, i: number) => (finishTimes[id] = i));
  const ranked = ctx.lobby.players
    .map((p: any) => ({ id: p.id, username: p.username, place: s.finishedOrder.indexOf(p.id) }))
    .sort((a: any, b: any) => {
      const ap = a.place === -1 ? Infinity : a.place;
      const bp = b.place === -1 ? Infinity : b.place;
      return ap - bp;
    });
  ctx.finishMatch({
    players: ranked.map((r: any, i: number) => ({
      id: r.id,
      username: r.username,
      score: Math.max(0, 100 - i * 15),
      place: i + 1,
      timeMs: Date.now() - s.startedAt,
    })),
  });
}

export default mazeEscape;
