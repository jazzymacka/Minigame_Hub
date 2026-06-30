import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { useGameChannel } from "../useGameChannel";
import type { GameComponentProps } from "../registry";

interface ReactionState {
  phase: "waiting" | "green" | "done";
  results: Record<string, { timeMs: number | null; falseStart: boolean }>;
}

export default function ReactionTest({ lobby, playerId }: GameComponentProps) {
  const { state, lastEvent, sendAction } = useGameChannel<ReactionState>();
  const [isGreen, setIsGreen] = useState(false);
  const [hasClicked, setHasClicked] = useState(false);

  useEffect(() => {
    if (lastEvent?.type === "reaction:waiting") {
      setIsGreen(false);
      setHasClicked(false);
    }
    if (lastEvent?.type === "reaction:green") setIsGreen(true);
  }, [lastEvent]);

  function handleClick() {
    if (hasClicked) return;
    setHasClicked(true);
    sendAction("click");
  }

  const myResult = state?.results[playerId];
  const everyoneIn = state ? Object.values(state.results).every((r) => r.timeMs !== null || r.falseStart) : false;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button
        onClick={handleClick}
        className={`flex h-72 w-full select-none flex-col items-center justify-center gap-3 rounded-2xl border-2 text-center transition-colors duration-150 ${
          isGreen ? "border-success bg-success/20" : "border-danger/40 bg-danger/10"
        }`}
      >
        <Zap size={36} className={isGreen ? "text-success" : "text-danger/70"} />
        <span className="font-display text-2xl font-bold text-ink">
          {hasClicked
            ? myResult?.falseStart
              ? "Too early!"
              : myResult?.timeMs != null
                ? `${myResult.timeMs} ms`
                : "Locked in…"
            : isGreen
              ? "CLICK NOW!"
              : "Wait for green…"}
        </span>
      </button>

      <div className="card-surface p-4">
        <h3 className="mb-3 font-display text-sm font-semibold text-ink">Live Results</h3>
        <div className="space-y-1.5">
          {lobby.players.map((p) => {
            const r = state?.results[p.id];
            return (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">{p.username}</span>
                <span className="font-mono text-ink">
                  {!r ? "—" : r.falseStart ? "False start" : r.timeMs != null ? `${r.timeMs} ms` : "Thinking…"}
                </span>
              </div>
            );
          })}
        </div>
        {!everyoneIn && <p className="mt-3 text-xs text-ink-faint">Waiting for everyone to react…</p>}
      </div>
    </div>
  );
}
