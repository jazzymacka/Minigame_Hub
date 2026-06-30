import { useEffect, useState } from "react";
import { MousePointerClick } from "lucide-react";
import { useGameChannel } from "../useGameChannel";
import type { GameComponentProps } from "../registry";

interface ClickState {
  startedAt: number;
  counts: Record<string, number>;
}

export default function ClickSpeed({ lobby, playerId }: GameComponentProps) {
  const { state, lastEvent, sendAction } = useGameChannel<ClickState>();
  const [durationMs, setDurationMs] = useState(10000);
  const [timeLeft, setTimeLeft] = useState(10000);
  const [myCount, setMyCount] = useState(0);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (lastEvent?.type !== "click:start") return;
    const e = lastEvent as unknown as { durationMs: number };
    setDurationMs(e.durationMs);
    const start = Date.now();
    const interval = setInterval(() => {
      const left = Math.max(0, e.durationMs - (Date.now() - start));
      setTimeLeft(left);
      if (left <= 0) {
        setEnded(true);
        clearInterval(interval);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [lastEvent]);

  function handleClick() {
    if (ended) return;
    setMyCount((c) => c + 1);
    sendAction("click");
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 text-center">
      <div className="card-surface p-4">
        <div className="mb-2 h-2 overflow-hidden rounded-full bg-elevated">
          <div className="h-full bg-accent transition-all duration-75" style={{ width: `${(timeLeft / durationMs) * 100}%` }} />
        </div>
        <p className="font-mono text-sm text-ink-muted">{(timeLeft / 1000).toFixed(1)}s left</p>
      </div>

      <button
        onClick={handleClick}
        disabled={ended}
        className="flex h-60 w-full select-none flex-col items-center justify-center gap-3 rounded-2xl border-2 border-accent/40 bg-accent/10 transition-transform duration-75 active:scale-95 disabled:opacity-50"
      >
        <MousePointerClick size={40} className="text-accent" />
        <span className="font-display text-4xl font-bold text-ink">{myCount}</span>
        <span className="text-sm text-ink-muted">{ended ? "Time's up!" : "Click as fast as you can"}</span>
      </button>

      <div className="card-surface p-4">
        <h3 className="mb-3 font-display text-sm font-semibold text-ink">Live Leaderboard</h3>
        <div className="space-y-1.5">
          {[...lobby.players]
            .sort((a, b) => (state?.counts[b.id] ?? 0) - (state?.counts[a.id] ?? 0))
            .map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className={p.id === playerId ? "font-medium text-ink" : "text-ink-muted"}>{p.username}</span>
                <span className="font-mono text-ink">{state?.counts[p.id] ?? 0}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
