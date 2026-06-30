import { useEffect, useState } from "react";
import { Target, Timer } from "lucide-react";
import { useGameChannel } from "../useGameChannel";
import type { GameComponentProps } from "../registry";

interface ColourOption {
  id: string;
  hex: string;
}
interface ColourState {
  round: number;
  totalRounds: number;
  target: string;
  options: ColourOption[];
  roundStartedAt: number;
  roundTimeMs: number;
  answered: Record<string, boolean>;
  scores: Record<string, number>;
}

export default function ColourReflex({ lobby, playerId }: GameComponentProps) {
  const { state, sendAction } = useGameChannel<ColourState>();
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Reset the local "selected" choice whenever a new round begins.
  useEffect(() => {
    setSelected(null);
  }, [state?.round]);

  // Drive the countdown purely off server timestamps, so it's correct
  // even if this component mounted mid-round (e.g. after a resync).
  useEffect(() => {
    if (!state) return;
    const update = () => setTimeLeft(Math.max(0, state.roundTimeMs - (Date.now() - state.roundStartedAt)));
    update();
    const interval = setInterval(update, 80);
    return () => clearInterval(interval);
  }, [state?.round, state?.roundStartedAt, state?.roundTimeMs]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state) return <p className="text-center text-ink-muted">Get ready…</p>;

  const hasAnswered = !!state.answered[playerId];
  const revealed = timeLeft <= 0 || Object.values(state.answered).every(Boolean);

  function pick(colourId: string) {
    if (hasAnswered || revealed) return;
    setSelected(colourId);
    sendAction("select", { colourId });
  }

  const sortedPlayers = [...lobby.players].sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="card-surface p-5 text-center">
        <div className="mb-3 flex items-center justify-between text-xs text-ink-faint">
          <span className="flex items-center gap-1.5 font-medium text-accent">
            <Target size={14} /> Round {state.round + 1} / {state.totalRounds}
          </span>
          <span className="flex items-center gap-1 font-mono">
            <Timer size={13} /> {(timeLeft / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-elevated">
          <div
            className="h-full bg-accent transition-all duration-75"
            style={{ width: `${(timeLeft / Math.max(state.roundTimeMs, 1)) * 100}%` }}
          />
        </div>

        <p className="mb-1 text-sm text-ink-muted">Click the colour:</p>
        <h2 className="mb-5 font-display text-2xl font-bold capitalize text-ink">{state.target}</h2>

        <div className={`grid gap-3 ${state.options.length > 5 ? "grid-cols-4" : "grid-cols-3"}`}>
          {state.options.map((opt) => {
            const isCorrect = revealed && opt.id === state.target;
            const isWrongSelected = revealed && selected === opt.id && opt.id !== state.target;
            return (
              <button
                key={opt.id}
                onClick={() => pick(opt.id)}
                disabled={hasAnswered || revealed}
                className={`aspect-square rounded-xl border-2 transition-transform duration-100 ${
                  isCorrect ? "scale-105 border-success" : isWrongSelected ? "border-danger opacity-60" : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: opt.hex }}
                aria-label={opt.id}
              />
            );
          })}
        </div>
        {revealed && <p className="mt-4 text-sm text-ink-muted">It was {state.target}.</p>}
      </div>

      <div className="card-surface p-4">
        <h3 className="mb-3 font-display text-sm font-semibold text-ink">Scoreboard</h3>
        <div className="space-y-1.5">
          {sortedPlayers.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className={p.id === playerId ? "font-medium text-ink" : "text-ink-muted"}>{p.username}</span>
              <span className="font-mono text-ink">{state.scores[p.id] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
