import type { ServerGameModule } from "../types.js";

const COURT_W = 600;
const COURT_H = 360;
const PADDLE_H = 80;
const PADDLE_SPEED = 12;
const BALL_SPEED = 6;
const WINNING_SCORE = 5;

interface PongState {
  paddles: Record<string, { y: number; targetY: number; score: number; side: "left" | "right" }>;
  ball: { x: number; y: number; vx: number; vy: number };
  playerOrder: string[];
}

function resetBall(towards: 1 | -1): PongState["ball"] {
  return { x: COURT_W / 2, y: COURT_H / 2, vx: BALL_SPEED * towards, vy: (Math.random() - 0.5) * BALL_SPEED };
}

const pongDuel: ServerGameModule = {
  id: "pong-duel",
  name: "Pong Duel",
  description: "Classic two-player Pong. First to 5 points wins.",
  icon: "🏓",
  minPlayers: 2,
  maxPlayers: 2,
  estimatedMatchLength: "2-4 min",
  tickRateMs: 33,

  onStart(ctx) {
    const [p1, p2] = ctx.lobby.players;
    const paddles: PongState["paddles"] = {
      [p1.id]: { y: COURT_H / 2 - PADDLE_H / 2, targetY: COURT_H / 2 - PADDLE_H / 2, score: 0, side: "left" },
      [p2.id]: { y: COURT_H / 2 - PADDLE_H / 2, targetY: COURT_H / 2 - PADDLE_H / 2, score: 0, side: "right" },
    };
    const state: PongState = { paddles, ball: resetBall(1), playerOrder: [p1.id, p2.id] };
    ctx.setState(state);
    ctx.emitToLobby("game:event", { type: "pong:start", courtW: COURT_W, courtH: COURT_H, paddleH: PADDLE_H });
  },

  onAction(ctx, playerId, action, payload) {
    if (action !== "move") return;
    const s = ctx.getState<PongState>();
    const paddle = s.paddles[playerId];
    if (!paddle) return;
    const { targetY } = payload as { targetY: number };
    paddle.targetY = Math.max(0, Math.min(COURT_H - PADDLE_H, targetY));
    ctx.setState(s);
  },

  onTick(ctx) {
    const s = ctx.getState<PongState>();
    for (const paddle of Object.values(s.paddles)) {
      const diff = paddle.targetY - paddle.y;
      paddle.y += Math.sign(diff) * Math.min(Math.abs(diff), PADDLE_SPEED);
    }

    const ball = s.ball;
    ball.x += ball.vx;
    ball.y += ball.vy;
    if (ball.y <= 0 || ball.y >= COURT_H) ball.vy *= -1;

    const [leftId, rightId] = s.playerOrder;
    const left = s.paddles[leftId];
    const right = s.paddles[rightId];
    const PADDLE_DEPTH = 14;

    if (ball.vx < 0 && ball.x <= PADDLE_DEPTH) {
      if (ball.y >= left.y && ball.y <= left.y + PADDLE_H) {
        ball.vx *= -1.05;
        ball.vy += (ball.y - (left.y + PADDLE_H / 2)) * 0.08;
      } else if (ball.x < 0) {
        right.score++;
        Object.assign(ball, resetBall(1));
      }
    } else if (ball.vx > 0 && ball.x >= COURT_W - PADDLE_DEPTH) {
      if (ball.y >= right.y && ball.y <= right.y + PADDLE_H) {
        ball.vx *= -1.05;
        ball.vy += (ball.y - (right.y + PADDLE_H / 2)) * 0.08;
      } else if (ball.x > COURT_W) {
        left.score++;
        Object.assign(ball, resetBall(-1));
      }
    }

    ctx.setState(s);
    ctx.emitState();

    const winner = Object.entries(s.paddles).find(([, p]) => p.score >= WINNING_SCORE);
    if (winner) {
      const ranked = ctx.lobby.players
        .map((p) => ({ id: p.id, username: p.username, score: s.paddles[p.id].score }))
        .sort((a, b) => b.score - a.score);
      ctx.finishMatch({ players: ranked.map((r, i) => ({ ...r, place: i + 1 })) });
    }
  },
};

export default pongDuel;
