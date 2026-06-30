import { useEffect, useRef, useState } from "react";
import { Palette, Timer, Send } from "lucide-react";
import { useGameChannel } from "../useGameChannel";
import type { GameComponentProps } from "../registry";

interface Stroke {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
interface DrawState {
  round: number;
  totalRounds: number;
  artistId: string;
  correctGuessers: string[];
  scores: Record<string, number>;
  roundStartedAt: number;
  roundTimeMs: number;
  strokes: Stroke[];
  lastRevealedWord: string | null;
}
interface GuessFeedItem {
  id: string;
  text: string;
  correct?: boolean;
}

const WIDTH = 600;
const HEIGHT = 360;

export default function DrawingGuessing({ lobby, playerId }: GameComponentProps) {
  const { state, lastEvent, sendAction } = useGameChannel<DrawState>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [myWord, setMyWord] = useState<string | null>(null);
  const [guess, setGuess] = useState("");
  const [feed, setFeed] = useState<GuessFeedItem[]>([]);
  const strokesDrawnRef = useRef(0);

  const isArtist = state?.artistId === playerId;

  function nameOf(id: string) {
    return lobby.players.find((p) => p.id === id)?.username ?? "Someone";
  }

  function drawSegment(stroke: Stroke) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#E7EAF1";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(stroke.x0 * WIDTH, stroke.y0 * HEIGHT);
    ctx.lineTo(stroke.x1 * WIDTH, stroke.y1 * HEIGHT);
    ctx.stroke();
  }

  // When the round changes (or we resync mid-round), clear and replay every
  // stroke the server has recorded so far — this is what makes a late-mounted
  // canvas (or a reconnecting client) show the in-progress drawing correctly,
  // instead of relying on having caught every individual stroke event live.
  useEffect(() => {
    if (!state) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    state.strokes.forEach(drawSegment);
    strokesDrawnRef.current = state.strokes.length;
    setMyWord(null);
    setFeed([]);
    setTimeLeft(state.roundTimeMs);
  }, [state?.round]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw any new strokes that arrive live via state updates without a full
  // round change (covers normal in-round drawing for everyone watching).
  useEffect(() => {
    if (!state) return;
    const newStrokes = state.strokes.slice(strokesDrawnRef.current);
    newStrokes.forEach(drawSegment);
    strokesDrawnRef.current = state.strokes.length;
  }, [state?.strokes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!state) return;
    const update = () => setTimeLeft(Math.max(0, state.roundTimeMs - (Date.now() - state.roundStartedAt)));
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [state?.round, state?.roundStartedAt, state?.roundTimeMs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const e = lastEvent as any;
    if (!e) return;
    if (e.type === "draw:yourWord") setMyWord(e.word);
    if (e.type === "draw:chatGuess") {
      setFeed((f) => [...f.slice(-30), { id: `${Date.now()}-${Math.random()}`, text: `${nameOf(e.playerId)}: ${e.text}` }]);
    }
    if (e.type === "draw:correctGuess") {
      setFeed((f) => [...f.slice(-30), { id: `${Date.now()}-${Math.random()}`, text: `${nameOf(e.playerId)} guessed it!`, correct: true }]);
    }
    if (e.type === "draw:roundEnd") {
      setFeed((f) => [...f.slice(-30), { id: `${Date.now()}-${Math.random()}`, text: `The word was "${e.word}"`, correct: true }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent]);

  if (!state) return <p className="text-center text-ink-muted">Setting up the round…</p>;

  function pointFromEvent(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    if (!isArtist) return;
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(e);
  }
  function moveDraw(e: React.MouseEvent | React.TouchEvent) {
    if (!isArtist || !drawingRef.current || !lastPointRef.current) return;
    const point = pointFromEvent(e);
    const stroke: Stroke = { x0: lastPointRef.current.x, y0: lastPointRef.current.y, x1: point.x, y1: point.y };
    drawSegment(stroke);
    strokesDrawnRef.current += 1;
    sendAction("stroke", stroke);
    lastPointRef.current = point;
  }
  function endDraw() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  function submitGuess() {
    const text = guess.trim();
    if (!text) return;
    sendAction("guess", { text });
    setGuess("");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-sm text-ink-muted">
        <span className="flex items-center gap-1.5 font-medium text-accent">
          <Palette size={14} /> Round {state.round + 1} / {state.totalRounds} — {nameOf(state.artistId)} is drawing
        </span>
        <span className="flex items-center gap-1 font-mono">
          <Timer size={13} /> {Math.ceil(timeLeft / 1000)}s
        </span>
      </div>

      {isArtist && myWord && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-center font-display font-semibold text-accent">
          Your word: {myWord}
        </div>
      )}

      <div className="card-surface p-3">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className={`w-full rounded-xl bg-[#0F1320] ${isArtist ? "cursor-crosshair" : ""}`}
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
        />
      </div>

      {!isArtist && (
        <div className="flex gap-2">
          <input
            className="input-field"
            placeholder="Type your guess…"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitGuess()}
          />
          <button className="btn-secondary !px-3" onClick={submitGuess}>
            <Send size={15} />
          </button>
        </div>
      )}

      <div className="card-surface max-h-40 space-y-1 overflow-y-auto p-3">
        {feed.map((item) => (
          <p key={item.id} className={`text-sm ${item.correct ? "text-success" : "text-ink-muted"}`}>
            {item.text}
          </p>
        ))}
        {feed.length === 0 && <p className="text-xs text-ink-faint">Guesses will appear here.</p>}
      </div>

      <div className="card-surface p-4">
        <h3 className="mb-3 font-display text-sm font-semibold text-ink">Scoreboard</h3>
        <div className="space-y-1.5">
          {[...lobby.players].sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0)).map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">{p.username}</span>
              <span className="font-mono text-ink">{state.scores[p.id] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
