import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Crown, DoorOpen, UserPlus, Play, Check, Users } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { GAME_META } from "../games/meta";
import { GAME_REGISTRY } from "../games/registry";
import PlayerCard from "../components/lobby/PlayerCard";
import ChatPanel from "../components/lobby/ChatPanel";
import InvitePlayersModal from "../components/lobby/InvitePlayersModal";
import Countdown from "../components/Countdown";
import MatchResultsScreen from "../components/MatchResultsScreen";
import type { Lobby, MatchResult } from "../types";

export default function LobbyPage() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const { socket } = useSocket();
  const { playerId } = useAuth();
  const { pushToast } = useNotifications();
  const navigate = useNavigate();

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  useEffect(() => {
    if (!lobbyId) return;
    socket.emit("lobby:join", { lobbyId });

    const onState = (data: Lobby) => {
      if (data.id !== lobbyId) return;
      setLobby(data);
      if (data.status === "waiting") setMatchResult(null);
    };
    const onClosed = () => {
      pushToast("The lobby was closed.", "error");
      navigate("/");
    };
    const onKicked = (data: { lobbyId: string }) => {
      if (data.lobbyId !== lobbyId) return;
      pushToast("You were removed from the lobby.", "error");
      navigate("/");
    };
    const onCountdown = (data: { seconds: number }) => setCountdownSeconds(data.seconds);
    const onFinished = (result: MatchResult) => {
      if (result.lobbyId !== lobbyId) return;
      setMatchResult(result);
    };

    socket.on("lobby:state", onState);
    socket.on("lobby:closed", onClosed);
    socket.on("lobby:kicked", onKicked);
    socket.on("countdown:start", onCountdown);
    socket.on("game:finished", onFinished);

    return () => {
      socket.off("lobby:state", onState);
      socket.off("lobby:closed", onClosed);
      socket.off("lobby:kicked", onKicked);
      socket.off("countdown:start", onCountdown);
      socket.off("game:finished", onFinished);
    };
  }, [lobbyId, socket, navigate, pushToast]);

  if (!lobby || !playerId) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const meta = GAME_META[lobby.gameId];
  const isHost = lobby.hostId === playerId;
  const me = lobby.players.find((p) => p.id === playerId);
  const allReady = lobby.players.length > 0 && lobby.players.every((p) => p.ready || p.isHost);
  const GameComponent = GAME_REGISTRY[lobby.gameId];

  function leave() {
    socket.emit("lobby:leave");
    navigate("/");
  }
  function toggleReady() {
    socket.emit("lobby:ready", { ready: !me?.ready });
  }
  function kick(targetId: string) {
    socket.emit("lobby:kick", { playerId: targetId });
  }
  function start() {
    socket.emit("lobby:start");
  }
  function rematch() {
    socket.emit("lobby:rematch");
  }

  if (countdownSeconds !== null && lobby.status === "countdown") {
    return <Countdown seconds={countdownSeconds} onDone={() => setCountdownSeconds(null)} />;
  }

  if (lobby.status === "finished" && matchResult) {
    return (
      <MatchResultsScreen result={matchResult} lobby={lobby} isHost={isHost} onRematch={rematch} onLeave={leave} />
    );
  }

  if (lobby.status === "in-progress" && GameComponent) {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <span>{meta?.icon}</span> {lobby.name}
          </h1>
          <button className="btn-secondary !px-3 !py-1.5 text-sm" onClick={leave}>
            <DoorOpen size={14} /> Leave
          </button>
        </div>
        <GameComponent lobby={lobby} playerId={playerId} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <span>{meta?.icon}</span> {lobby.name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {meta?.name} · Hosted by {lobby.players.find((p) => p.isHost)?.username}
          </p>
        </div>
        <div className="flex gap-2">
          {isHost && (
            <button className="btn-secondary" onClick={() => setShowInvite(true)}>
              <UserPlus size={15} /> Invite Players
            </button>
          )}
          <button className="btn-danger" onClick={leave}>
            <DoorOpen size={15} /> Leave Lobby
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display font-semibold text-ink">
                <Users size={16} className="text-accent" />
                Players ({lobby.players.length}/{lobby.maxPlayers})
              </h2>
              {!isHost && (
                <button
                  className={`btn-secondary !px-3 !py-1.5 text-xs ${me?.ready ? "!border-success/40 !text-success" : ""}`}
                  onClick={toggleReady}
                >
                  <Check size={13} /> {me?.ready ? "Ready" : "Mark Ready"}
                </button>
              )}
            </div>

            <div className="space-y-2">
              {lobby.players.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <PlayerCard player={p} isSelf={p.id === playerId} />
                  </div>
                  {isHost && p.id !== playerId && (
                    <button
                      className="rounded-lg border border-danger/30 px-2.5 py-2 text-xs text-danger transition-colors hover:bg-danger/10"
                      onClick={() => kick(p.id)}
                    >
                      Kick
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isHost && (
              <button className="btn-primary mt-5 w-full" onClick={start} disabled={!allReady}>
                <Play size={16} /> Start Game
              </button>
            )}
            {isHost && !allReady && (
              <p className="mt-2 text-center text-xs text-ink-faint">Waiting for all players to mark ready.</p>
            )}
            {!isHost && (
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-faint">
                <Crown size={12} className="text-warning" /> Only the host can start the game.
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <ChatPanel initialMessages={lobby.chat} lobbyId={lobby.id} />
        </div>
      </div>

      <InvitePlayersModal open={showInvite} onClose={() => setShowInvite(false)} excludeIds={lobby.players.map((p) => p.id)} />
    </div>
  );
}
