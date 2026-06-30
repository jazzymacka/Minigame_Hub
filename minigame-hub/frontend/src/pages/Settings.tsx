import { useState } from "react";
import { Check } from "lucide-react";
import { useAuth, AVATAR_COLOURS } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import Toggle from "../components/ui/Toggle";
import Avatar from "../components/ui/Avatar";

export default function Settings() {
  const { username, avatarColour, setProfile } = useAuth();
  const { notificationsEnabled, setNotificationsEnabled, soundEnabled, setSoundEnabled, reducedMotion, setReducedMotion } =
    useSettings();
  const [name, setName] = useState(username);
  const [colour, setColour] = useState(avatarColour);
  const [saved, setSaved] = useState(false);

  function commit(nextName: string, nextColour: string) {
    setProfile(nextName.trim() || username, nextColour);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="mx-auto max-w-xl animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Changes save automatically.</p>
      </div>

      <div className="card-surface space-y-5 p-5">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-ink">Profile</h2>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-success animate-fade-in">
              <Check size={12} /> Saved
            </span>
          )}
        </div>

        <div className="flex justify-center">
          <Avatar username={name} colour={colour} size={56} ring />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">Username</label>
          <input
            className="input-field"
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => commit(name, colour)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">Avatar colour</label>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLOURS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColour(c);
                  commit(name, c);
                }}
                className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${colour === c ? "ring-2 ring-white ring-offset-2 ring-offset-surface" : ""}`}
                style={{ backgroundColor: c }}
                aria-label={`Choose colour ${c}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="card-surface space-y-1 p-5">
        <h2 className="mb-2 font-display font-semibold text-ink">Preferences</h2>
        <Toggle
          checked={notificationsEnabled}
          onChange={setNotificationsEnabled}
          label="Notifications"
          description="Toast alerts for invites, lobby activity, and connection status"
        />
        <div className="h-px bg-border" />
        <Toggle checked={soundEnabled} onChange={setSoundEnabled} label="Sound" description="Short sound cues during games" />
        <div className="h-px bg-border" />
        <Toggle
          checked={reducedMotion}
          onChange={setReducedMotion}
          label="Reduced motion"
          description="Minimise animations across the app"
        />
      </div>
    </div>
  );
}
