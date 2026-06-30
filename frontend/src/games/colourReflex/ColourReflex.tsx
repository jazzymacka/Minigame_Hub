import { useEffect, useState } from "react";
import { Target, Timer } from "lucide-react";
import { useGameChannel } from "../useGameChannel";
import type { GameComponentProps } from "../registry";

interface ColourOption {
  id: string;
  hex: string;
}
interface RoundEvent {
  type: "colour:round";
  round: number;
  totalRounds: number;
  target: string;
  options: ColourOption[];
  timeMs: number;
}
interface RevealEvent {
  type: "colour:reveal";
  target: string;
  scores: Record<string, number>;
}

export default function ColourReflex({ lobby, playerId }: GameComponentProps) {
  const { lastEvent, sendAction } = useGameChannel();
  const [round, setRound] = useState<RoundEvent | null>(null);
  const [reveal, setReveal] = useState<RevealEvent | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    const e = lastEvent as any;
    if (!e) return;
    if (e.type === "colour:round") {
      setRound(e);
      setReveal(null);
      setSelected(null);
      const start = Date.now();
      const interval = setInterval(() => {
        const left = Math.max(0, e.timeMs - (Date.now() - start));
        setTimeLeft(left);
        if (left <= 0) clearInterval(interval);
      }, 80);
      return () => clearInterval(interval);
    }
    if (e.type === "colour:reveal") {
      setReveal(e);
      setScores(e.scores);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent]);

  if (!round) return <p className="text-center text-ink-muted">Get ready…</p>;

  function pick(colourId: string) {
    if (selected || reveal) return;
    setSelected(colourId);
    sendAction("select", { colourId });
  }

  const targetOption = round.options.find((o) => o.id === round.target);
  const sortedPlayers = [...lobby.players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="card-surface p-5 text-center">
        <div className="mb-3 flex items-center justify-between text-xs text-ink-faint">
          <span className="flex items-center gap-1.5 font-medium text-accent">
            <Target size={14} /> Round {round.round + 1} / {round.totalRounds}
          </span>
          <span className="flex items-center gap-1 font-mono">
            <Timer size={13} /> {(timeLeft / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-elevated">
          <div className="h-full bg-accent transition-all duration-75" style={{ width: `${(timeLeft / round.timeMs) * 100}%` }} />
        </div>

        <p className="mb-1 text-sm text-ink-muted">Click the colour:</p>
        <h2 className="mb-5 font-display text-2xl font-bold capitalize text-ink">{round.target}</h2>

        <div className={`grid gap-3 ${round.options.length > 5 ? "grid-cols-4" : "grid-cols-3"}`}>
          {round.options.map((opt) => {
            const isCorrect = reveal && opt.id === reveal.target;
            const isWrongSelected = reveal && selected === opt.id && opt.id !== reveal.target;
            return (
              <button
                key={opt.id}
                onClick={() => pick(opt.id)}
                disabled={!!selected || !!reveal}
                className={`aspect-square rounded-xl border-2 transition-transform duration-100 ${
                  isCorrect ? "scale-105 border-success" : isWrongSelected ? "border-danger opacity-60" : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: opt.hex }}
                aria-label={opt.id}
              />
            );
          })}
        </div>
        {reveal && targetOption && <p className="mt-4 text-sm text-ink-muted">It was {reveal.target}.</p>}
      </div>

      <div className="card-surface p-4">
        <h3 className="mb-3 font-display text-sm font-semibold text-ink">Scoreboard</h3>
        <div className="space-y-1.5">
          {sortedPlayers.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className={p.id === playerId ? "font-medium text-ink" : "text-ink-muted"}>{p.username}</span>
              <span className="font-mono text-ink">{scores[p.id] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
