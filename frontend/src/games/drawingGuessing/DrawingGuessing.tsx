import { useEffect, useRef, useState } from "react";
import { Palette, Timer, Send } from "lucide-react";
import { useGameChannel } from "../useGameChannel";
import type { GameComponentProps } from "../registry";

interface GuessFeedItem {
  id: string;
  text: string;
  correct?: boolean;
}

export default function DrawingGuessing({ lobby, playerId }: GameComponentProps) {
  const { lastEvent, sendAction } = useGameChannel();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [round, setRound] = useState({ index: 0, total: 1 });
  const [timeLeft, setTimeLeft] = useState(0);
  const [myWord, setMyWord] = useState<string | null>(null);
  const [guess, setGuess] = useState("");
  const [feed, setFeed] = useState<GuessFeedItem[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const isArtist = artistId === playerId;
  const WIDTH = 600;
  const HEIGHT = 360;

  useEffect(() => {
    const e = lastEvent as any;
    if (!e) return;
    if (e.type === "draw:roundStart") {
      setArtistId(e.artistId);
      setRound({ index: e.round, total: e.totalRounds });
      setMyWord(null);
      setFeed([]);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, WIDTH, HEIGHT);
      const start = Date.now();
      const interval = setInterval(() => {
        const left = Math.max(0, e.timeMs - (Date.now() - start));
        setTimeLeft(left);
        if (left <= 0) clearInterval(interval);
      }, 200);
      return () => clearInterval(interval);
    }
    if (e.type === "draw:yourWord") setMyWord(e.word);
    if (e.type === "draw:stroke" && e.stroke) drawSegment(e.stroke);
    if (e.type === "draw:chatGuess") {
      setFeed((f) => [...f.slice(-30), { id: `${Date.now()}-${Math.random()}`, text: `${nameOf(e.playerId)}: ${e.text}` }]);
    }
    if (e.type === "draw:correctGuess") {
      setFeed((f) => [...f.slice(-30), { id: `${Date.now()}-${Math.random()}`, text: `${nameOf(e.playerId)} guessed it!`, correct: true }]);
    }
    if (e.type === "draw:roundEnd") {
      setScores(e.scores);
      setFeed((f) => [...f.slice(-30), { id: `${Date.now()}-${Math.random()}`, text: `The word was "${e.word}"`, correct: true }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent]);

  function nameOf(id: string) {
    return lobby.players.find((p) => p.id === id)?.username ?? "Someone";
  }

  function drawSegment(stroke: { x0: number; y0: number; x1: number; y2?: number; y1: number }) {
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
    const stroke = { x0: lastPointRef.current.x, y0: lastPointRef.current.y, x1: point.x, y1: point.y };
    drawSegment(stroke);
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
          <Palette size={14} /> Round {round.index + 1} / {round.total} — {nameOf(artistId ?? "")} is drawing
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
          {[...lobby.players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0)).map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">{p.username}</span>
              <span className="font-mono text-ink">{scores[p.id] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
