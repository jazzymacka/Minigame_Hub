import { useEffect, useRef } from "react";
import { useGameChannel } from "../useGameChannel";
import type { GameComponentProps } from "../registry";

type Dir = "up" | "down" | "left" | "right";
interface Snake {
  id: string;
  username: string;
  segments: [number, number][];
  alive: boolean;
  score: number;
}
interface SnakeState {
  grid: number;
  snakes: Record<string, Snake>;
  food: [number, number];
}

const KEY_MAP: Record<string, Dir> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right",
};

export default function SnakeBattle({ lobby, playerId }: GameComponentProps) {
  const { state, sendAction } = useGameChannel<SnakeState>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const CANVAS_SIZE = 420;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const dir = KEY_MAP[e.key];
      if (dir) {
        e.preventDefault();
        sendAction("direction", { dir });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cell = CANVAS_SIZE / state.grid;

    ctx.fillStyle = "#0F1320";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.strokeStyle = "#1c2333";
    for (let i = 0; i <= state.grid; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, CANVAS_SIZE);
      ctx.moveTo(0, i * cell);
      ctx.lineTo(CANVAS_SIZE, i * cell);
      ctx.stroke();
    }

    ctx.fillStyle = "#F87171";
    ctx.beginPath();
    ctx.arc((state.food[0] + 0.5) * cell, (state.food[1] + 0.5) * cell, cell * 0.35, 0, Math.PI * 2);
    ctx.fill();

    const colours = ["#4F8CFF", "#34D399", "#FBBF24", "#A855F7", "#EC4899", "#06B6D4"];
    Object.values(state.snakes).forEach((snake, idx) => {
      const colour = colours[idx % colours.length];
      ctx.globalAlpha = snake.alive ? 1 : 0.25;
      snake.segments.forEach(([x, y], i) => {
        ctx.fillStyle = colour;
        ctx.beginPath();
        const r = i === 0 ? cell * 0.48 : cell * 0.4;
        ctx.roundRect(x * cell + (cell - r * 2) / 2, y * cell + (cell - r * 2) / 2, r * 2, r * 2, 4);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    });
  }, [state]);

  const aliveCount = state ? Object.values(state.snakes).filter((s) => s.alive).length : 0;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between text-sm text-ink-muted">
        <span>{aliveCount} alive</span>
        <span className="text-xs text-ink-faint">Arrow keys or WASD to steer</span>
      </div>
      <div className="card-surface flex justify-center p-3">
        <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="rounded-xl" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {lobby.players.map((p) => {
          const snake = state?.snakes[p.id];
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                snake?.alive === false ? "border-border bg-elevated/40 opacity-60" : "border-border bg-elevated/60"
              } ${p.id === playerId ? "ring-1 ring-accent/40" : ""}`}
            >
              <span className="truncate text-ink-muted">{p.username}</span>
              <span className="font-mono text-ink">{snake?.score ?? 0}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
