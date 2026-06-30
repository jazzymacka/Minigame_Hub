import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const KEYS = {
  notifications: "mh_settings_notifications",
  sound: "mh_settings_sound",
  reducedMotion: "mh_settings_reducedMotion",
};

function readBool(key: string, fallback: boolean) {
  const v = localStorage.getItem(key);
  return v === null ? fallback : v === "true";
}

interface SettingsContextValue {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  reducedMotion: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  playBeep: (kind: "tick" | "success" | "error") => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [notificationsEnabled, setNotificationsEnabledState] = useState(() => readBool(KEYS.notifications, true));
  const [soundEnabled, setSoundEnabledState] = useState(() => readBool(KEYS.sound, true));
  const [reducedMotion, setReducedMotionState] = useState(() => readBool(KEYS.reducedMotion, false));

  useEffect(() => {
    document.body.classList.toggle("reduced-motion", reducedMotion);
  }, [reducedMotion]);

  function setNotificationsEnabled(v: boolean) {
    setNotificationsEnabledState(v);
    localStorage.setItem(KEYS.notifications, String(v));
  }
  function setSoundEnabled(v: boolean) {
    setSoundEnabledState(v);
    localStorage.setItem(KEYS.sound, String(v));
  }
  function setReducedMotion(v: boolean) {
    setReducedMotionState(v);
    localStorage.setItem(KEYS.reducedMotion, String(v));
  }

  function playBeep(kind: "tick" | "success" | "error") {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const freq = kind === "success" ? 880 : kind === "error" ? 220 : 440;
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
      osc.onended = () => ctx.close();
    } catch {
      // Audio not available; fail silently.
    }
  }

  return (
    <SettingsContext.Provider
      value={{
        notificationsEnabled,
        soundEnabled,
        reducedMotion,
        setNotificationsEnabled,
        setSoundEnabled,
        setReducedMotion,
        playBeep,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
