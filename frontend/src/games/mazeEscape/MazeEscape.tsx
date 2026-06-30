import { useEffect, useMemo, useState } from "react";
import { Compass, Flag } from "lucide-react";
import { useGameChannel } from "../useGameChannel";
import type { GameComponentProps } from "../registry";

type Cell = { walls: { n: boolean; s: boolean; e: boolean; w: boolean } };
interface MazeState {
  size: number;
  positions: Record<string, [number, number]>;
  finishedOrder: string[];
}
interface StartEvent {
  type: "maze:start";
  size: number;
  maze: Cell[][];
  exit: [number, number];
}

const KEY_MAP: Record<string, "up" | "down" | "left" | "right"> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right",
};

export default function MazeEscape({ lobby, playerId }: GameComponentProps) {
  const { state, lastEvent, sendAction } = useGameChannel<MazeState>();
  const [maze, setMaze] = useState<Cell[][] | null>(null);
  const [size, setSize] = useState(15);
  const [exit, setExit] = useState<[number, number]>([14, 14]);

  useEffect(() => {
    if (lastEvent?.type === "maze:start") {
      const e = lastEvent as unknown as StartEvent;
      setMaze(e.maze);
      setSize(e.size);
      setExit(e.exit);
    }
  }, [lastEvent]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const dir = KEY_MAP[e.key];
      if (dir) {
        e.preventDefault();
        sendAction("move", { dir });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cellPx = 22;
  const colours = useMemo(
    () => ["#4F8CFF", "#34D399", "#FBBF24", "#A855F7", "#EC4899", "#06B6D4", "#F97316", "#F87171"],
    []
  );

  if (!maze || !state) return <p className="text-center text-ink-muted">Generating maze…</p>;

  const dim = size * cellPx;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-sm text-ink-muted">
        <span className="flex items-center gap-1.5 font-medium text-accent">
          <Compass size={14} /> Race to the exit
        </span>
        <span className="text-xs text-ink-faint">Arrow keys or WASD</span>
      </div>

      <div className="card-surface flex justify-center overflow-auto p-3">
        <svg width={dim} height={dim} className="rounded-xl bg-[#0F1320]">
          {maze.map((row, y) =>
            row.map((cell, x) => {
              const x0 = x * cellPx;
              const y0 = y * cellPx;
              const lines = [];
              if (cell.walls.n) lines.push(<line key="n" x1={x0} y1={y0} x2={x0 + cellPx} y2={y0} />);
              if (cell.walls.s) lines.push(<line key="s" x1={x0} y1={y0 + cellPx} x2={x0 + cellPx} y2={y0 + cellPx} />);
              if (cell.walls.e) lines.push(<line key="e" x1={x0 + cellPx} y1={y0} x2={x0 + cellPx} y2={y0 + cellPx} />);
              if (cell.walls.w) lines.push(<line key="w" x1={x0} y1={y0} x2={x0} y2={y0 + cellPx} />);
              return (
                <g key={`${x}-${y}`} stroke="#2B3245" strokeWidth={2} strokeLinecap="round">
                  {lines}
                </g>
              );
            })
          )}
          <rect x={exit[0] * cellPx + 3} y={exit[1] * cellPx + 3} width={cellPx - 6} height={cellPx - 6} rx={4} fill="#34D39933" stroke="#34D399" />
          {lobby.players.map((p, i) => {
            const pos = state.positions[p.id];
            if (!pos) return null;
            const finished = state.finishedOrder.includes(p.id);
            return (
              <circle
                key={p.id}
                cx={pos[0] * cellPx + cellPx / 2}
                cy={pos[1] * cellPx + cellPx / 2}
                r={cellPx * 0.3}
                fill={colours[i % colours.length]}
                opacity={finished ? 0.4 : 1}
                stroke={p.id === playerId ? "#fff" : "none"}
                strokeWidth={1.5}
              />
            );
          })}
        </svg>
      </div>

      <div className="card-surface p-4">
        <h3 className="mb-3 flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
          <Flag size={14} className="text-success" /> Finish Order
        </h3>
        {state.finishedOrder.length === 0 ? (
          <p className="text-xs text-ink-faint">No one has finished yet.</p>
        ) : (
          <div className="space-y-1.5">
            {state.finishedOrder.map((id, i) => (
              <div key={id} className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">#{i + 1}</span>
                <span className="text-ink">{lobby.players.find((p) => p.id === id)?.username}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
