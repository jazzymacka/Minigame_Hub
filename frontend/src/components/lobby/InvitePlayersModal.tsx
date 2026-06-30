import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Check } from "lucide-react";
import Modal from "../ui/Modal";
import Avatar from "../ui/Avatar";
import { apiGet } from "../../lib/api";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import type { OnlineUser } from "../../types";

export default function InvitePlayersModal({
  open,
  onClose,
  excludeIds,
}: {
  open: boolean;
  onClose: () => void;
  excludeIds: string[];
}) {
  const { socket } = useSocket();
  const { playerId } = useAuth();
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [search, setSearch] = useState("");
  const [invited, setInvited] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    apiGet<OnlineUser[]>(`/users/online${playerId ? `?excluding=${playerId}` : ""}`).then(setUsers).catch(() => {});
    const onOnline = (list: OnlineUser[]) => setUsers(list.filter((u) => u.id !== playerId));
    socket.on("users:online", onOnline);
    return () => {
      socket.off("users:online", onOnline);
    };
  }, [open, socket, playerId]);

  const filtered = useMemo(
    () =>
      users
        .filter((u) => !excludeIds.includes(u.id))
        .filter((u) => u.username.toLowerCase().includes(search.toLowerCase())),
    [users, excludeIds, search]
  );

  function invite(user: OnlineUser) {
    socket.emit("lobby:invite", { toPlayerId: user.id });
    setInvited((prev) => new Set(prev).add(user.id));
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite Players">
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            autoFocus
            className="input-field pl-9"
            placeholder="Search online players…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-80 space-y-1.5 overflow-y-auto">
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-ink-muted">No online players found.</p>}
          {filtered.map((user) => (
            <div key={user.id} className="flex items-center gap-3 rounded-xl border border-border bg-elevated/60 p-2.5">
              <Avatar username={user.username} colour={user.avatarColour} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{user.username}</p>
                <p className="text-xs text-ink-faint">{user.inLobby ? "In a lobby" : "Idle"}</p>
              </div>
              <button
                className={`btn-secondary !px-3 !py-1.5 text-xs ${invited.has(user.id) ? "!border-success/40 !text-success" : ""}`}
                onClick={() => invite(user)}
                disabled={invited.has(user.id)}
              >
                {invited.has(user.id) ? (
                  <>
                    <Check size={13} /> Invited
                  </>
                ) : (
                  <>
                    <UserPlus size={13} /> Invite
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
