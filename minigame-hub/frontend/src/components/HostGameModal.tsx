import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./ui/Modal";
import Toggle from "./ui/Toggle";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import type { GameSummary, Lobby } from "../types";

interface HostGameModalProps {
  game: GameSummary | null;
  onClose: () => void;
}

export default function HostGameModal({ game, onClose }: HostGameModalProps) {
  const { socket } = useSocket();
  const { username } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(game?.maxPlayers ?? 4);
  const [isPublic, setIsPublic] = useState(true);
  const [allowSpectators, setAllowSpectators] = useState(true);
  const [creating, setCreating] = useState(false);

  if (!game) return null;
  const selectedGame = game;

  function handleCreate() {
    setCreating(true);
    const onState = (lobby: Lobby) => {
      socket.off("lobby:state", onState);
      setCreating(false);
      onClose();
      navigate(`/lobby/${lobby.id}`);
    };
    socket.on("lobby:state", onState);
    socket.emit("lobby:create", {
      gameId: selectedGame.id,
      name: name.trim() || `${username}'s Lobby`,
      maxPlayers,
      isPublic,
      allowSpectators,
    });
  }

  return (
    <Modal open={!!game} onClose={onClose} title={`Host ${game.name}`}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">Lobby Name</label>
          <input
            className="input-field"
            placeholder={`${username}'s Lobby`}
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
            Maximum Players ({game.minPlayers}–{game.maxPlayers})
          </label>
          <input
            type="range"
            min={game.minPlayers}
            max={game.maxPlayers}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="text-right text-sm text-ink-muted">{maxPlayers} players</div>
        </div>

        <div className="card-surface !bg-elevated divide-y divide-border p-1">
          <div className="px-3 py-2">
            <Toggle checked={isPublic} onChange={setIsPublic} label="Public lobby" description="Show this lobby on the Join Games page" />
          </div>
          <div className="px-3 py-2">
            <Toggle checked={allowSpectators} onChange={setAllowSpectators} label="Allow spectators" description="Let others watch without playing" />
          </div>
        </div>

        <button className="btn-primary w-full" onClick={handleCreate} disabled={creating}>
          {creating ? "Creating…" : "Create Lobby"}
        </button>
      </div>
    </Modal>
  );
}
