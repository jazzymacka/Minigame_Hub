import { useEffect, useState } from "react";
import { Trophy, Gamepad2, Star, History } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiGet } from "../lib/api";
import { GAME_META } from "../games/meta";
import Avatar from "../components/ui/Avatar";
import type { ProfileStats } from "../types";

export default function Profile() {
  const { playerId, username, avatarColour } = useAuth();
  const [stats, setStats] = useState<ProfileStats | null>(null);

  useEffect(() => {
    if (!playerId) return;
    apiGet<ProfileStats>(`/profile/${playerId}`).then(setStats).catch(() => {});
  }, [playerId]);

  const winRate = stats && stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="card-surface flex flex-col items-center gap-3 p-6 sm:flex-row sm:items-center sm:gap-5 sm:text-left">
        <Avatar username={username} colour={avatarColour} size={64} ring />
        <div className="text-center sm:text-left">
          <h1 className="font-display text-xl font-bold text-ink">{username}</h1>
          <p className="text-sm text-ink-muted">Player ID: {playerId?.slice(0, 8)}…</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Gamepad2} label="Games Played" value={stats?.gamesPlayed ?? 0} />
        <StatCard icon={Trophy} label="Wins" value={stats?.wins ?? 0} />
        <StatCard icon={Star} label="Win Rate" value={`${winRate}%`} />
        <StatCard
          icon={Gamepad2}
          label="Favourite Game"
          value={stats?.favouriteGame ? GAME_META[stats.favouriteGame]?.name ?? stats.favouriteGame : "—"}
          small
        />
      </div>

      <div className="card-surface p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display font-semibold text-ink">
          <History size={16} className="text-accent" /> Recent Matches
        </h2>
        {!stats || stats.recentMatches.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">No matches played yet — go host a game!</p>
        ) : (
          <div className="space-y-2">
            {stats.recentMatches.map((m, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 bg-elevated/50 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{GAME_META[m.gameId]?.icon ?? "🎮"}</span>
                  <span className="text-sm font-medium text-ink">{GAME_META[m.gameId]?.name ?? m.gameId}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className={`font-mono ${m.place === 1 ? "text-accent" : "text-ink-muted"}`}>#{m.place}</span>
                  <span className="font-mono text-ink-muted">{m.score} pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, small }: { icon: typeof Trophy; label: string; value: string | number; small?: boolean }) {
  return (
    <div className="card-surface p-4 text-center">
      <Icon size={18} className="mx-auto mb-2 text-accent" />
      <div className={`font-display font-bold text-ink ${small ? "text-sm" : "text-xl"}`}>{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-faint">{label}</div>
    </div>
  );
}
