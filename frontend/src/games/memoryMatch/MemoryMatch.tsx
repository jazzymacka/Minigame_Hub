import { Brain, Check, Hourglass } from "lucide-react";
import { useGameChannel } from "../useGameChannel";
import type { GameComponentProps } from "../registry";

interface PlayerBoard {
  deck: string[];
  matched: boolean[];
  flipped: number[];
  startedAt: number;
  finishedAt: number | null;
}
interface MemoryState {
  boards: Record<string, PlayerBoard>;
}

export default function MemoryMatch({ lobby, playerId }: GameComponentProps) {
  const { state, sendAction } = useGameChannel<MemoryState>();
  const board = state?.boards[playerId];

  if (!state || !board) return <p className="text-center text-ink-muted">Dealing cards…</p>;

  const finished = board.finishedAt !== null;
  const elapsed = (finished ? board.finishedAt! : Date.now()) - board.startedAt;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="card-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2 font-display text-sm font-semibold text-accent">
            <Brain size={16} /> Your Board
          </span>
          <span className="flex items-center gap-1.5 font-mono text-sm text-ink-muted">
            <Hourglass size={14} /> {(elapsed / 1000).toFixed(1)}s
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-4">
          {board.deck.map((icon, i) => {
            const faceUp = board.matched[i] || board.flipped.includes(i);
            return (
              <button
                key={i}
                onClick={() => !faceUp && !finished && sendAction("flip", { index: i })}
                disabled={faceUp || finished}
                className={`flex aspect-square items-center justify-center rounded-xl border text-2xl transition-all duration-200 [transform-style:preserve-3d] ${
                  board.matched[i]
                    ? "border-success/40 bg-success/10"
                    : faceUp
                      ? "border-accent/40 bg-accent/10"
                      : "border-border bg-elevated hover:border-accent/40 hover:-translate-y-0.5"
                }`}
              >
                {faceUp ? icon : ""}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card-surface p-4">
        <h3 className="mb-3 font-display text-sm font-semibold text-ink">Race Status</h3>
        <div className="space-y-1.5">
          {lobby.players.map((p) => {
            const b = state.boards[p.id];
            const pct = b ? Math.round((b.matched.filter(Boolean).length / b.matched.length) * 100) : 0;
            return (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">{p.username}</span>
                {b?.finishedAt !== null && b !== undefined ? (
                  <span className="flex items-center gap-1 font-mono text-success">
                    <Check size={13} /> {((b.finishedAt! - b.startedAt) / 1000).toFixed(1)}s
                  </span>
                ) : (
                  <span className="font-mono text-ink-faint">{pct}%</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
