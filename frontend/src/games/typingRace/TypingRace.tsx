import { useEffect, useRef, useState } from "react";
import { Keyboard } from "lucide-react";
import { useGameChannel } from "../useGameChannel";
import type { GameComponentProps } from "../registry";

interface TypingState {
  text: string;
  startedAt: number;
  finished: Record<string, { wpm: number; accuracy: number; timeMs: number } | null>;
  progress: Record<string, number>;
}

export default function TypingRace({ lobby, playerId }: GameComponentProps) {
  const { state, sendAction } = useGameChannel<TypingState>();
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, [state?.text]);

  if (!state) {
    return <p className="text-center text-ink-muted">Loading paragraph…</p>;
  }

  const text = state.text;
  const startedAt = state.startedAt;
  let errors = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] !== text[i]) errors++;

  function handleChange(value: string) {
    if (done || value.length > text.length) return;
    setTyped(value);
    if (Date.now() - lastSentRef.current > 150) {
      sendAction("progress", { charsTyped: value.length });
      lastSentRef.current = Date.now();
    }
    if (value.length === text.length) {
      const correct = value.split("").filter((c, i) => c === text[i]).length;
      const accuracy = correct / text.length;
      const timeMs = Date.now() - startedAt;
      const minutes = timeMs / 60000;
      const wpm = Math.round(text.split(" ").length / Math.max(minutes, 0.05));
      sendAction("finish", { wpm, accuracy, timeMs });
      setDone(true);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="card-surface p-5">
        <div className="mb-3 flex items-center gap-2 text-accent">
          <Keyboard size={16} />
          <span className="font-display text-sm font-semibold">Type this paragraph</span>
        </div>
        <p className="select-none font-mono text-lg leading-relaxed">
          {text.split("").map((char, i) => {
            let cls = "text-ink-faint";
            if (i < typed.length) cls = typed[i] === char ? "text-success" : "text-danger bg-danger/10";
            else if (i === typed.length) cls = "text-ink underline";
            return (
              <span key={i} className={cls}>
                {char}
              </span>
            );
          })}
        </p>
        <input
          ref={inputRef}
          className="input-field mt-4"
          value={typed}
          disabled={done}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={done ? "Finished — waiting for others…" : "Start typing…"}
          autoFocus
        />
        {errors > 0 && !done && <p className="mt-1 text-xs text-danger">{errors} character(s) off — keep going.</p>}
      </div>

      <div className="card-surface p-4">
        <h3 className="mb-3 font-display text-sm font-semibold text-ink">Progress</h3>
        <div className="space-y-3">
          {lobby.players.map((p) => {
            const progress = (p.id === playerId ? typed.length / text.length : state.progress[p.id]) ?? 0;
            const finished = state.finished[p.id];
            return (
              <div key={p.id}>
                <div className="mb-1 flex justify-between text-xs text-ink-muted">
                  <span>{p.username}</span>
                  <span className="font-mono">{finished ? `${finished.wpm} WPM · ${Math.round(finished.accuracy * 100)}%` : `${Math.round(progress * 100)}%`}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-elevated">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-150"
                    style={{ width: `${Math.min(100, progress * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
