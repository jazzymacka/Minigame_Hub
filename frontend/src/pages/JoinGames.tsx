import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, Clock } from "lucide-react";
import { apiGet } from "../lib/api";
import { useSocket } from "../context/SocketContext";
import type { GameSummary, Lobby } from "../types";

function timeSince(ts: number) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function JoinGames() {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [playerCountFilter, setPlayerCountFilter] = useState<string>("any");
  const [, setTick] = useState(0);

  useEffect(() => {
    apiGet<Lobby[]>("/lobbies/public").then(setLobbies).catch(() => {});
    apiGet<GameSummary[]>("/games").then(setGames).catch(() => {});
    const onPublic = (data: Lobby[]) => setLobbies(data);
    socket.on("lobbies:public", onPublic);
    const interval = setInterval(() => setTick((t) => t + 1), 5000); // refresh "time since created"
    return () => {
      socket.off("lobbies:public", onPublic);
      clearInterval(interval);
    };
  }, [socket]);

  const gameNameById = useMemo(() => new Map(games.map((g) => [g.id, g])), [games]);

  const filtered = lobbies.filter((lobby) => {
    if (gameFilter !== "all" && lobby.gameId !== gameFilter) return false;
    if (playerCountFilter === "low" && lobby.players.length > 2) return false;
    if (playerCountFilter === "mid" && (lobby.players.length < 3 || lobby.players.length > 5)) return false;
    if (playerCountFilter === "high" && lobby.players.length < 6) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const gameName = gameNameById.get(lobby.gameId)?.name.toLowerCase() ?? "";
      if (!lobby.name.toLowerCase().includes(q) && !gameName.includes(q) && !lobby.hostId.toLowerCase().includes(q)) {
        const hostUsername = lobby.players.find((p) => p.isHost)?.username.toLowerCase() ?? "";
        if (!hostUsername.includes(q)) return false;
      }
    }
    return true;
  });

  function join(lobbyId: string) {
    socket.emit("lobby:join", { lobbyId });
    navigate(`/lobby/${lobbyId}`);
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Join a Game</h1>
        <p className="mt-1 text-sm text-ink-muted">Browse open public lobbies and jump straight in.</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="input-field pl-9"
            placeholder="Search by lobby, host, or game…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field sm:w-48" value={gameFilter} onChange={(e) => setGameFilter(e.target.value)}>
          <option value="all">All games</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <select className="input-field sm:w-44" value={playerCountFilter} onChange={(e) => setPlayerCountFilter(e.target.value)}>
          <option value="any">Any size</option>
          <option value="low">1–2 players</option>
          <option value="mid">3–5 players</option>
          <option value="high">6+ players</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-2 py-16 text-center">
          <Users size={28} className="text-ink-faint" />
          <p className="text-ink-muted">No open lobbies match your filters right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lobby) => {
            const game = gameNameById.get(lobby.gameId);
            const host = lobby.players.find((p) => p.isHost);
            return (
              <div key={lobby.id} className="card-surface animate-slide-up p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-ink-faint">
                    <Clock size={12} /> {timeSince(lobby.createdAt)}
                  </span>
                  <span className="rounded-full bg-elevated px-2 py-0.5 text-xs text-ink-muted">{game?.icon} {game?.name ?? lobby.gameId}</span>
                </div>
                <h3 className="font-display font-semibold text-ink">{lobby.name}</h3>
                <p className="mb-3 text-xs text-ink-muted">Hosted by {host?.username ?? "Unknown"}</p>
                <div className="mb-4 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-ink-muted">
                    <Users size={14} /> {lobby.players.length} / {lobby.maxPlayers}
                  </span>
                  <div className="flex -space-x-2">
                    {lobby.players.slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        className="h-6 w-6 rounded-full border-2 border-surface"
                        style={{ backgroundColor: p.avatarColour }}
                        title={p.username}
                      />
                    ))}
                  </div>
                </div>
                <button className="btn-primary w-full" onClick={() => join(lobby.id)}>
                  Join
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
