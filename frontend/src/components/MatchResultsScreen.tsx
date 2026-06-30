import { Trophy, Medal, RotateCcw, DoorOpen } from "lucide-react";
import Avatar from "./ui/Avatar";
import type { Lobby, MatchResult } from "../types";

const PLACE_COLOURS = ["text-warning", "text-ink-muted", "text-orange-400"];

export default function MatchResultsScreen({
  result,
  lobby,
  isHost,
  onRematch,
  onLeave,
}: {
  result: MatchResult;
  lobby: Lobby;
  isHost: boolean;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const playerLookup = new Map(lobby.players.map((p) => [p.id, p]));

  return (
    <div className="animate-scale-in mx-auto max-w-lg">
      <div className="card-surface overflow-hidden p-6 text-center">
        <Trophy size={36} className="mx-auto mb-2 text-warning" />
        <h2 className="font-display text-xl font-bold text-ink">Match Complete</h2>
        <p className="mb-6 text-sm text-ink-muted">{lobby.name}</p>

        <div className="space-y-2">
          {result.players.map((p, i) => {
            const lobbyPlayer = playerLookup.get(p.id);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  i === 0 ? "border-warning/40 bg-warning/5" : "border-border bg-elevated/50"
                }`}
              >
                <span className={`w-7 font-display text-lg font-bold ${PLACE_COLOURS[i] ?? "text-ink-faint"}`}>
                  {i < 3 ? <Medal size={18} className="inline" /> : `#${p.place}`}
                </span>
                <Avatar username={p.username} colour={lobbyPlayer?.avatarColour ?? "#4F8CFF"} size={32} />
                <span className="flex-1 text-left text-sm font-medium text-ink">{p.username}</span>
                <span className="font-mono text-sm text-ink-muted">{p.score} pts</span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          {isHost && (
            <button className="btn-primary flex-1" onClick={onRematch}>
              <RotateCcw size={15} /> Rematch
            </button>
          )}
          <button className="btn-secondary flex-1" onClick={onLeave}>
            <DoorOpen size={15} /> Leave Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
