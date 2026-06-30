import type { ServerGameModule } from "../types.js";

const GRID = 24;
type Dir = "up" | "down" | "left" | "right";
const DELTAS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

interface Snake {
  id: string;
  username: string;
  segments: [number, number][];
  dir: Dir;
  queuedDir: Dir;
  alive: boolean;
  score: number;
  diedAt: number | null;
}

interface SnakeState {
  grid: number;
  snakes: Record<string, Snake>;
  food: [number, number];
  tick: number;
}

function randomCell(): [number, number] {
  return [Math.floor(Math.random() * GRID), Math.floor(Math.random() * GRID)];
}

function spawnFood(state: SnakeState) {
  let cell = randomCell();
  const occupied = new Set(Object.values(state.snakes).flatMap((s) => s.segments.map((seg) => seg.join(","))));
  while (occupied.has(cell.join(","))) cell = randomCell();
  state.food = cell;
}

const snakeBattle: ServerGameModule = {
  id: "snake-battle",
  name: "Snake Battle",
  description: "Grow by eating food. Avoid walls and other snakes. Last one alive wins.",
  icon: "🐍",
  minPlayers: 2,
  maxPlayers: 6,
  estimatedMatchLength: "1-3 min",
  tickRateMs: 120,

  onStart(ctx) {
    const snakes: Record<string, Snake> = {};
    const starts: [number, number][] = [[4, 4], [GRID - 5, GRID - 5], [4, GRID - 5], [GRID - 5, 4], [GRID / 2, 3], [GRID / 2, GRID - 4]];
    ctx.lobby.players.forEach((p, i) => {
      const [sx, sy] = starts[i % starts.length];
      const dir: Dir = sx < GRID / 2 ? "right" : "left";
      snakes[p.id] = {
        id: p.id,
        username: p.username,
        segments: [[sx, sy], [sx - DELTAS[dir][0], sy - DELTAS[dir][1]]],
        dir,
        queuedDir: dir,
        alive: true,
        score: 0,
        diedAt: null,
      };
    });
    const state: SnakeState = { grid: GRID, snakes, food: [0, 0], tick: 0 };
    spawnFood(state);
    ctx.setState(state);
    ctx.emitToLobby("game:event", { type: "snake:start", grid: GRID });
  },

  onAction(ctx, playerId, action, payload) {
    if (action !== "direction") return;
    const s = ctx.getState<SnakeState>();
    const snake = s.snakes[playerId];
    if (!snake || !snake.alive) return;
    const dir = (payload as { dir: Dir }).dir;
    if (OPPOSITE[dir] !== snake.dir) snake.queuedDir = dir;
    ctx.setState(s);
  },

  onPlayerLeave(ctx, playerId) {
    const s = ctx.getState<SnakeState>();
    if (s.snakes[playerId]) {
      s.snakes[playerId].alive = false;
      s.snakes[playerId].diedAt = Date.now();
    }
    ctx.setState(s);
  },

  onTick(ctx) {
    const s = ctx.getState<SnakeState>();
    s.tick++;
    const aliveSnakes = Object.values(s.snakes).filter((sn) => sn.alive);

    for (const snake of aliveSnakes) {
      snake.dir = snake.queuedDir;
      const [dx, dy] = DELTAS[snake.dir];
      const [hx, hy] = snake.segments[0];
      const newHead: [number, number] = [hx + dx, hy + dy];

      const hitWall = newHead[0] < 0 || newHead[0] >= s.grid || newHead[1] < 0 || newHead[1] >= s.grid;
      const willEat = newHead[0] === s.food[0] && newHead[1] === s.food[1];
      const newSegments = [newHead, ...snake.segments.slice(0, willEat ? undefined : -1)];

      // Hits own body (excluding the tail cell that's about to move/disappear) or any other alive snake's body.
      const hitsSelf = snake.segments.slice(0, willEat ? undefined : -1).some((seg) => seg[0] === newHead[0] && seg[1] === newHead[1]);
      const hitsOther = Object.values(s.snakes).some(
        (other) => other.id !== snake.id && other.alive && other.segments.some((seg) => seg[0] === newHead[0] && seg[1] === newHead[1])
      );

      if (hitWall || hitsSelf || hitsOther) {
        snake.alive = false;
        snake.diedAt = Date.now();
        continue;
      }
      snake.segments = newSegments;
      if (willEat) {
        snake.score += 10;
        spawnFood(s);
      }
    }

    ctx.setState(s);
    ctx.emitState();

    const stillAlive = Object.values(s.snakes).filter((sn) => sn.alive);
    if (stillAlive.length <= 1 && Object.keys(s.snakes).length > 1) {
      const ranked = Object.values(s.snakes).sort((a, b) => {
        if (a.alive && !b.alive) return -1;
        if (!a.alive && b.alive) return 1;
        if (a.alive && b.alive) return b.score - a.score;
        return (b.diedAt ?? 0) - (a.diedAt ?? 0);
      });
      ctx.finishMatch({
        players: ranked.map((sn, i) => ({ id: sn.id, username: sn.username, score: sn.score, place: i + 1 })),
      });
    }
  },
};

export default snakeBattle;
