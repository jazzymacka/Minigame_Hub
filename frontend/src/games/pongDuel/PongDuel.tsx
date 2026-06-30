import { useEffect, useRef, useState } from "react";
import { useGameChannel } from "../useGameChannel";
import type { GameComponentProps } from "../registry";

interface PongState {
  paddles: Record<string, { y: number; score: number; side: "left" | "right" }>;
  ball: { x: number; y: number };
}

export default function PongDuel({ lobby, playerId }: GameComponentProps) {
  const { state, lastEvent, sendAction } = useGameChannel<PongState>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dims, setDims] = useState({ courtW: 600, courtH: 360, paddleH: 80 });
  const targetYRef = useRef(dims.courtH / 2 - dims.paddleH / 2);

  useEffect(() => {
    if (lastEvent?.type === "pong:start") {
      const e = lastEvent as unknown as { courtW: number; courtH: number; paddleH: number };
      setDims({ courtW: e.courtW, courtH: e.courtH, paddleH: e.paddleH });
    }
  }, [lastEvent]);

  function updateTarget(clientY: number, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scale = dims.courtH / rect.height;
    const y = (clientY - rect.top) * scale - dims.paddleH / 2;
    targetYRef.current = Math.max(0, Math.min(dims.courtH - dims.paddleH, y));
    sendAction("move", { targetY: targetYRef.current });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      const delta = e.key === "ArrowUp" ? -24 : 24;
      targetYRef.current = Math.max(0, Math.min(dims.courtH - dims.paddleH, targetYRef.current + delta));
      sendAction("move", { targetY: targetYRef.current });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { courtW, courtH, paddleH } = dims;

    ctx.fillStyle = "#0F1320";
    ctx.fillRect(0, 0, courtW, courtH);
    ctx.strokeStyle = "#232A3A";
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(courtW / 2, 0);
    ctx.lineTo(courtW / 2, courtH);
    ctx.stroke();
    ctx.setLineDash([]);

    const entries = Object.entries(state.paddles);
    entries.forEach(([, paddle]) => {
      ctx.fillStyle = paddle.side === "left" ? "#4F8CFF" : "#34D399";
      const x = paddle.side === "left" ? 6 : courtW - 14;
      ctx.fillRect(x, paddle.y, 8, paddleH);
    });

    ctx.fillStyle = "#E7EAF1";
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }, [state, dims]);

  const me = state?.paddles[playerId];
  const opponent = lobby.players.find((p) => p.id !== playerId);
  const opponentState = opponent ? state?.paddles[opponent.id] : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between font-mono text-2xl font-bold text-ink">
        <span>{me?.score ?? 0}</span>
        <span className="text-sm font-normal text-ink-faint">vs {opponent?.username ?? "opponent"}</span>
        <span>{opponentState?.score ?? 0}</span>
      </div>
      <div className="card-surface flex justify-center p-3">
        <canvas
          ref={canvasRef}
          width={dims.courtW}
          height={dims.courtH}
          className="w-full max-w-[600px] cursor-none rounded-xl"
          onMouseMove={(e) => updateTarget(e.clientY, e.currentTarget)}
          onTouchMove={(e) => updateTarget(e.touches[0].clientY, e.currentTarget)}
        />
      </div>
      <p className="mt-3 text-center text-xs text-ink-faint">Move your mouse over the board, or use Arrow Up / Down.</p>
    </div>
  );
}
