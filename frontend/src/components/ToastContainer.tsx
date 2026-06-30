import { useNotifications } from "../context/NotificationContext";
import { X, Check, Gamepad2, Info, CheckCircle2, AlertCircle } from "lucide-react";

const KIND_STYLES: Record<string, string> = {
  info: "border-border",
  success: "border-success/40",
  error: "border-danger/40",
  invite: "border-accent/50",
};

export default function ToastContainer() {
  const { toasts, dismissToast, respondToInvite } = useNotifications();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`glass animate-slide-up rounded-xl border ${KIND_STYLES[toast.kind]} p-3.5 shadow-card`}
        >
          {toast.kind === "invite" && toast.invite ? (
            <div>
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 rounded-lg bg-accent/15 p-1.5 text-accent">
                  <Gamepad2 size={16} />
                </div>
                <p className="flex-1 text-sm leading-snug">
                  <span className="font-semibold text-ink">{toast.invite.fromUsername}</span>{" "}
                  invited you to join <span className="font-semibold text-ink">{toast.invite.lobbyName}</span>
                </p>
                <button onClick={() => dismissToast(toast.id)} className="text-ink-faint hover:text-ink">
                  <X size={15} />
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  className="btn-primary !py-1.5 flex-1 text-sm"
                  onClick={() => respondToInvite(toast.invite!, true)}
                >
                  <Check size={14} /> Accept
                </button>
                <button
                  className="btn-secondary !py-1.5 flex-1 text-sm"
                  onClick={() => respondToInvite(toast.invite!, false)}
                >
                  Decline
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 text-ink-muted">
                {toast.kind === "success" ? (
                  <CheckCircle2 size={16} className="text-success" />
                ) : toast.kind === "error" ? (
                  <AlertCircle size={16} className="text-danger" />
                ) : (
                  <Info size={16} />
                )}
              </div>
              <p className="flex-1 text-sm leading-snug text-ink">{toast.message}</p>
              <button onClick={() => dismissToast(toast.id)} className="text-ink-faint hover:text-ink">
                <X size={15} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
