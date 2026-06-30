import { useEffect, useState } from "react";
import { Brain, Timer } from "lucide-react";
import { useGameChannel } from "../useGameChannel";
import type { GameComponentProps } from "../registry";

interface TriviaState {
  roundIndex: number;
  totalRounds: number;
  question: string;
  choices: string[];
  roundStartedAt: number;
  roundTimeMs: number;
  revealed: boolean;
  correctIndex: number | null;
  answered: Record<string, number | null>;
  scores: Record<string, number>;
}

export default function Trivia({ lobby, playerId }: GameComponentProps) {
  const { state, sendAction } = useGameChannel<TriviaState>();
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!state) return;
    const update = () => setTimeLeft(Math.max(0, state.roundTimeMs - (Date.now() - state.roundStartedAt)));
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [state?.roundIndex, state?.roundStartedAt, state?.roundTimeMs]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state) return <p className="text-center text-ink-muted">Loading first question…</p>;

  const myAnswer = state.answered[playerId];
  const hasAnswered = myAnswer !== undefined && myAnswer !== null;

  function answer(choiceIndex: number) {
    if (hasAnswered || state!.revealed) return;
    sendAction("answer", { choiceIndex });
  }

  const sortedPlayers = [...lobby.players].sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="card-surface p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-ink-faint">
          <span className="flex items-center gap-1.5 font-medium text-accent">
            <Brain size={14} /> Round {state.roundIndex + 1} / {state.totalRounds}
          </span>
          <span className="flex items-center gap-1 font-mono">
            <Timer size={13} /> {(timeLeft / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-elevated">
          <div
            className="h-full bg-accent transition-all duration-100"
            style={{ width: `${(timeLeft / Math.max(state.roundTimeMs, 1)) * 100}%` }}
          />
        </div>

        <h2 className="mb-4 font-display text-lg font-semibold text-ink">{state.question}</h2>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {state.choices.map((choice, i) => {
            const isCorrect = state.revealed && i === state.correctIndex;
            const isWrongSelected = state.revealed && myAnswer === i && i !== state.correctIndex;
            return (
              <button
                key={i}
                onClick={() => answer(i)}
                disabled={hasAnswered || state.revealed}
                className={`rounded-xl border p-3.5 text-left text-sm font-medium transition-all ${
                  isCorrect
                    ? "border-success bg-success/15 text-success"
                    : isWrongSelected
                      ? "border-danger bg-danger/15 text-danger"
                      : myAnswer === i
                        ? "border-accent bg-accent/10 text-ink"
                        : "border-border bg-elevated text-ink hover:border-accent/40"
                }`}
              >
                {choice}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card-surface p-4">
        <h3 className="mb-3 font-display text-sm font-semibold text-ink">Scoreboard</h3>
        <div className="space-y-1.5">
          {sortedPlayers.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">{p.username}</span>
              <span className="font-mono text-ink">{state.scores[p.id] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
