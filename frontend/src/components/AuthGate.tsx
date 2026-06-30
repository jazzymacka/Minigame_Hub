import { useState, type FormEvent } from "react";
import { Gamepad2 } from "lucide-react";
import { useAuth, AVATAR_COLOURS } from "../context/AuthContext";
import Avatar from "./ui/Avatar";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthed, setProfile } = useAuth();
  const [name, setName] = useState("");
  const [colour, setColour] = useState(AVATAR_COLOURS[0]);

  if (isAuthed) return <>{children}</>;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setProfile(trimmed, colour);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card-surface w-full max-w-sm animate-scale-in p-7 shadow-card">
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <div className="rounded-2xl bg-accent/15 p-3 text-accent">
            <Gamepad2 size={28} />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-ink">Welcome to Minigame Hub</h1>
            <p className="mt-1 text-sm text-ink-muted">Pick a name to start hosting and joining games.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center">
            <Avatar username={name || "?"} colour={colour} size={56} ring />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
              Username
            </label>
            <input
              autoFocus
              className="input-field"
              placeholder="e.g. NovaFox"
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
              Avatar colour
            </label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLOURS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColour(c)}
                  className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${colour === c ? "ring-2 ring-white ring-offset-2 ring-offset-surface" : ""}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Choose colour ${c}`}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={!name.trim()}>
            Enter Hub
          </button>
        </form>
      </div>
    </div>
  );
}
