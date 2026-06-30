import { useEffect, useState, useCallback } from "react";
import { Users, Clock, Activity, Layers } from "lucide-react";
import { apiGet } from "../lib/api";
import { useSocket } from "../context/SocketContext";
import type { GameSummary } from "../types";
import HostGameModal from "../components/HostGameModal";

export default function Home() {
  const { socket } = useSocket();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    apiGet<GameSummary[]>("/games").then(setGames).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 8000);
    socket.on("lobbies:public", refresh);
    socket.on("game:finished", refresh);
    return () => {
      clearInterval(interval);
      socket.off("lobbies:public", refresh);
      socket.off("game:finished", refresh);
    };
  }, [refresh, socket]);

  return (
    <div className="animate-fade-in">
      <div className="mb-7">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Game Library</h1>
        <p className="mt-1 text-sm text-ink-muted">Pick a game and host a lobby — friends can join in seconds.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-surface h-64 animate-pulse bg-elevated/40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <div key={game.id} className="game-card flex flex-col animate-slide-up">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-2xl">
                  {game.icon}
                </div>
                <div>
                  <h3 className="font-display font-semibold text-ink">{game.name}</h3>
                  <span className="text-xs text-ink-faint">
                    {game.minPlayers}–{game.maxPlayers} players · {game.estimatedMatchLength}
                  </span>
                </div>
              </div>

              <p className="mb-4 text-sm text-ink-muted">{game.description}</p>

              <div className="mb-5 mt-auto grid grid-cols-3 gap-2 text-center">
                <Stat icon={Layers} value={game.activeLobbies} label="Lobbies" />
                <Stat icon={Users} value={game.playersCurrentlyPlaying} label="Playing" />
                <Stat icon={Activity} value={game.totalTimesPlayed} label="Played" />
              </div>

              <button className="btn-primary w-full" onClick={() => setSelectedGame(game)}>
                Host Game
              </button>
            </div>
          ))}
        </div>
      )}

      <HostGameModal game={selectedGame} onClose={() => setSelectedGame(null)} />
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Clock; value: number; label: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-elevated/60 py-2">
      <div className="flex items-center justify-center gap-1 font-mono text-sm font-semibold text-ink">
        <Icon size={12} className="text-accent" />
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</div>
    </div>
  );
}
