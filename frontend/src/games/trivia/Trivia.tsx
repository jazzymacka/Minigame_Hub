import { useEffect, useState } from "react";
import { Brain, Timer } from "lucide-react";
import { useGameChannel } from "../useGameChannel";
import type { GameComponentProps } from "../registry";

interface TriviaState {
  roundIndex: number;
  scores: Record<string, number>;
}
interface RoundEvent {
  type: "trivia:round";
  roundIndex: number;
  totalRounds: number;
  question: string;
  choices: string[];
  timeMs: number;
}
interface RevealEvent {
  type: "trivia:reveal";
  correct: number;
  scores: Record<string, number>;
}

export default function Trivia({ lobby }: GameComponentProps) {
  const { state, lastEvent, sendAction } = useGameChannel<TriviaState>();
  const [round, setRound] = useState<RoundEvent | null>(null);
  const [reveal, setReveal] = useState<RevealEvent | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (lastEvent?.type === "trivia:round") {
      setRound(lastEvent as unknown as RoundEvent);
      setReveal(null);
      setSelected(null);
    }
    if (lastEvent?.type === "trivia:reveal") {
      setReveal(lastEvent as unknown as RevealEvent);
    }
  }, [lastEvent]);

  useEffect(() => {
    if (!round) return;
    const start = Date.now();
    setTimeLeft(round.timeMs);
    const interval = setInterval(() => {
      const left = Math.max(0, round.timeMs - (Date.now() - start));
      setTimeLeft(left);
      if (left <= 0) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [round]);

  if (!round) return <p className="text-center text-ink-muted">Loading first question…</p>;

  function answer(choiceIndex: number) {
    if (selected !== null || reveal) return;
    setSelected(choiceIndex);
    sendAction("answer", { choiceIndex });
  }

  const scores = reveal?.scores ?? state?.scores ?? {};
  const sortedPlayers = [...lobby.players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="card-surface p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-ink-faint">
          <span className="flex items-center gap-1.5 font-medium text-accent">
            <Brain size={14} /> Round {round.roundIndex + 1} / {round.totalRounds}
          </span>
          <span className="flex items-center gap-1 font-mono">
            <Timer size={13} /> {(timeLeft / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-elevated">
          <div className="h-full bg-accent transition-all duration-100" style={{ width: `${(timeLeft / round.timeMs) * 100}%` }} />
        </div>

        <h2 className="mb-4 font-display text-lg font-semibold text-ink">{round.question}</h2>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {round.choices.map((choice, i) => {
            const isCorrect = reveal && i === reveal.correct;
            const isWrongSelected = reveal && selected === i && i !== reveal.correct;
            return (
              <button
                key={i}
                onClick={() => answer(i)}
                disabled={selected !== null || !!reveal}
                className={`rounded-xl border p-3.5 text-left text-sm font-medium transition-all ${
                  isCorrect
                    ? "border-success bg-success/15 text-success"
                    : isWrongSelected
                      ? "border-danger bg-danger/15 text-danger"
                      : selected === i
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
              <span className="font-mono text-ink">{scores[p.id] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
