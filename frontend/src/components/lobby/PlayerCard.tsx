import { Crown, Check, Clock, WifiOff } from "lucide-react";
import Avatar from "../ui/Avatar";
import type { LobbyPlayer } from "../../types";

export default function PlayerCard({ player, isSelf }: { player: LobbyPlayer; isSelf: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 animate-scale-in ${
        isSelf ? "border-accent/40 bg-accent/5" : "border-border bg-elevated/60"
      } ${!player.connected ? "opacity-50" : ""}`}
    >
      <Avatar username={player.username} colour={player.avatarColour} size={38} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-ink">{player.username}</span>
          {player.isHost && <Crown size={13} className="shrink-0 text-warning" />}
          {!player.connected && <WifiOff size={12} className="shrink-0 text-danger" />}
        </div>
        <span className="text-xs text-ink-faint">{isSelf ? "You" : player.connected ? "Online" : "Reconnecting…"}</span>
      </div>
      {player.ready ? (
        <span className="flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
          <Check size={12} /> Ready
        </span>
      ) : (
        <span className="flex items-center gap-1 rounded-full bg-elevated px-2.5 py-1 text-xs font-medium text-ink-faint">
          <Clock size={12} /> Waiting
        </span>
      )}
    </div>
  );
}
