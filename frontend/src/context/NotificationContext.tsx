import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useSocket } from "./SocketContext";
import { useSettings } from "./SettingsContext";
import type { InviteReceived } from "../types";

export type ToastKind = "info" | "success" | "error" | "invite";

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
  invite?: InviteReceived;
  createdAt: number;
}

interface NotificationContextValue {
  toasts: ToastItem[];
  pushToast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: string) => void;
  respondToInvite: (invite: InviteReceived, accept: boolean) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { socket, connected } = useSocket();
  const { notificationsEnabled, playBeep } = useSettings();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      if (!notificationsEnabled && kind !== "invite") return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((t) => [...t, { id, kind, message, createdAt: Date.now() }]);
      const ttl = kind === "invite" ? 20000 : 4500;
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
    },
    [notificationsEnabled]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    const onInvite = (invite: InviteReceived) => {
      const id = `invite-${invite.inviteId}`;
      setToasts((t) => [...t, { id, kind: "invite", message: "", invite, createdAt: Date.now() }]);
      playBeep("tick");
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 20000);
    };
    const onError = (data: { message: string }) => pushToast(data.message, "error");
    socket.on("invite:received", onInvite);
    socket.on("error:toast", onError);
    return () => {
      socket.off("invite:received", onInvite);
      socket.off("error:toast", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const wasConnected = useState({ first: true })[0];
  useEffect(() => {
    if (wasConnected.first) {
      wasConnected.first = false;
      return;
    }
    pushToast(connected ? "Reconnected to server." : "Connection lost. Trying to reconnect…", connected ? "success" : "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  function respondToInvite(invite: InviteReceived, accept: boolean) {
    setToasts((t) => t.filter((x) => x.invite?.inviteId !== invite.inviteId));
    if (accept) {
      socket.emit("lobby:join", { lobbyId: invite.lobbyId });
    }
  }

  return (
    <NotificationContext.Provider value={{ toasts, pushToast, dismissToast, respondToInvite }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
