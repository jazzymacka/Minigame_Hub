import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSocket } from "./SocketContext";

const STORAGE_KEYS = {
  sessionId: "mh_sessionId",
  username: "mh_username",
  avatarColour: "mh_avatarColour",
};

export const AVATAR_COLOURS = [
  "#4F8CFF", "#F87171", "#34D399", "#FBBF24", "#A855F7", "#EC4899", "#06B6D4", "#F97316",
];

interface AuthContextValue {
  playerId: string | null;
  username: string;
  avatarColour: string;
  isAuthed: boolean;
  setProfile: (username: string, avatarColour: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [username, setUsername] = useState(() => localStorage.getItem(STORAGE_KEYS.username) || "");
  const [avatarColour, setAvatarColour] = useState(
    () => localStorage.getItem(STORAGE_KEYS.avatarColour) || AVATAR_COLOURS[0]
  );

  useEffect(() => {
    const onJoined = (data: { playerId: string; username: string; avatarColour: string }) => {
      setPlayerId(data.playerId);
      setUsername(data.username);
      setAvatarColour(data.avatarColour);
      localStorage.setItem(STORAGE_KEYS.sessionId, data.playerId);
      localStorage.setItem(STORAGE_KEYS.username, data.username);
      localStorage.setItem(STORAGE_KEYS.avatarColour, data.avatarColour);
    };
    socket.on("auth:joined", onJoined);

    const tryJoin = () => {
      if (!username) return;
      socket.emit("auth:join", {
        sessionId: localStorage.getItem(STORAGE_KEYS.sessionId) || undefined,
        username,
        avatarColour,
      });
    };
    if (socket.connected) tryJoin();
    socket.on("connect", tryJoin);

    return () => {
      socket.off("auth:joined", onJoined);
      socket.off("connect", tryJoin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  function setProfile(nextUsername: string, nextAvatarColour: string) {
    setUsername(nextUsername);
    setAvatarColour(nextAvatarColour);
    socket.emit("auth:join", {
      sessionId: localStorage.getItem(STORAGE_KEYS.sessionId) || undefined,
      username: nextUsername,
      avatarColour: nextAvatarColour,
    });
  }

  return (
    <AuthContext.Provider value={{ playerId, username, avatarColour, isAuthed: !!playerId, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
