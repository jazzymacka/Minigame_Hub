# Minigame Hub

A real-time multiplayer browser minigame platform. Host a lobby, invite friends (or let strangers join publicly), and play one of ten built-in minigames together — Reaction Test, Typing Race, Memory Match, Snake Battle, Pong Duel, Trivia, Drawing & Guessing, Click Speed Challenge, Colour Reflex, and Maze Escape.

```
minigame-hub/
  backend/   Express + Socket.IO + SQLite server
  frontend/  React + TypeScript + Tailwind client
```

## Quick start (local development)

You'll need Node.js 18+ installed.

```bash
# Terminal 1 — backend
cd backend
npm install
npm run dev          # starts on http://localhost:4000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev           # starts on http://localhost:5173
```

Open `http://localhost:5173`. Pick a username, then open a second browser (or incognito window) and pick a different username to test multiplayer locally.

> The backend writes a SQLite file to `backend/data/minigame-hub.sqlite` on first run — that's where match history and leaderboards live. Delete it any time to reset stats.

## How it's wired together

- **Sessions**: no email/password. On first visit the client generates nothing itself — the server hands back a `playerId` on `auth:join`, which the client stores in `localStorage` and replays on reconnect, so refreshing the page (or closing the tab and coming back) keeps the same identity.
- **Lobbies & matchmaking**: all lobby state (`backend/src/state/store.ts`) lives in memory for speed; durable stats (wins, leaderboards, match history) are written to SQLite (`backend/src/db.ts`) once a match finishes.
- **Real-time sync**: every lobby is a Socket.IO room. Joins/leaves/ready toggles/chat/invites/countdown/game actions all flow through `backend/src/sockets/index.ts` and broadcast back to that room.
- **Game engine**: each game is a small state machine that only knows three things — how to start, how to react to a player action, and (optionally) how to tick at a fixed rate. See "Adding a new game" below.

## Adding a new game

The whole point of the `games/` folder structure is that you should be able to add a game without touching lobby, chat, invite, matchmaking, or leaderboard code.

### 1. Backend — game logic

Create `backend/src/games/yourGame.ts`. It must implement `ServerGameModule` (defined in `backend/src/types.ts`):

```ts
import type { ServerGameModule } from "../types.js";

const yourGame: ServerGameModule = {
  id: "your-game",            // must be added to the GameId union in types.ts (both ends)
  name: "Your Game",
  description: "One sentence describing it.",
  icon: "🎮",                  // emoji works great and needs no asset pipeline
  minPlayers: 2,
  maxPlayers: 6,
  estimatedMatchLength: "1-2 min",

  onStart(ctx) {
    // Called once the countdown finishes. Build your initial state and
    // store it with ctx.setState(...). Use ctx.emitToLobby(...) for any
    // one-off announcements (e.g. "here's your word", "round started").
  },

  onAction(ctx, playerId, action, payload) {
    // Called whenever a player calls socket.emit("game:action", {...}).
    // Mutate ctx.getState(), call ctx.setState(...), then ctx.emitState()
    // to push the new state to everyone in the lobby.
    // When the match is over, call ctx.finishMatch({ players: [...] })
    // with each player's score/place — this is what writes to the
    // leaderboard and triggers the results screen for everyone.
  },

  // Optional: only needed for simulation-driven games (Snake, Pong).
  tickRateMs: 100,
  onTick(ctx) { /* advance the simulation, emitState() each tick */ },

  // Optional: clean up timers if a player disconnects mid-match.
  onPlayerLeave(ctx, playerId) {},
  onEnd(ctx) {},
};

export default yourGame;
```

Register it in `backend/src/games/index.ts` (import + add to the `modules` array). That's the *only* core file you touch — lobbies, matchmaking, chat, invites and leaderboards all pick it up automatically because they only ever look games up by `GameId` through this registry.

### 2. Frontend — the board UI

Create `frontend/src/games/yourGame/YourGame.tsx`. It receives `{ lobby, playerId }` and is responsible for rendering the live game and sending actions:

```tsx
import { useGameChannel } from "../useGameChannel";
import type { GameComponentProps } from "../registry";

export default function YourGame({ lobby, playerId }: GameComponentProps) {
  const { state, lastEvent, sendAction } = useGameChannel<YourStateType>();
  // render `state`, call sendAction("someAction", { ...payload }) on input
  return <div>...</div>;
}
```

`useGameChannel` already subscribes to `game:state` (the authoritative state blob) and `game:event` (one-off announcements like round starts/reveals) for you.

Then:
1. Add the game's display name/icon to `frontend/src/games/meta.ts`.
2. Import your component and register it in `frontend/src/games/registry.tsx`.
3. Add `"your-game"` to the `GameId` union in both `backend/src/types.ts` and `frontend/src/types/index.ts` (kept as two small files rather than a shared package, to keep the frontend and backend independently deployable).

Once those four edits are in, the new game shows up on the Home page, can be hosted/joined/invited into like any other, gets a leaderboard automatically (`/api/leaderboard/:gameId`), and counts toward profile stats — no other code changes required.

## Deploying to Render (free tier)

Render works well here: the backend is a standard long-running Node web service (needed for Socket.IO and SQLite), and the frontend is a static site.

### 1. Push to GitHub
Render deploys from a Git repo, so push this project (with the `backend/` and `frontend/` folders) to a GitHub repository first.

### 2. Deploy the backend as a Web Service
In the Render dashboard: **New → Web Service**, connect your repo, then set:
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Instance Type**: Free
- **Environment Variables**:
  - `CLIENT_ORIGIN` = the URL your frontend will be deployed at (e.g. `https://minigame-hub.onrender.com`) — needed for CORS and Socket.IO's CORS check. You can update this after the frontend is deployed and redeploy.

Render's free web services spin down after inactivity and cold-start on the next request — the client's Socket.IO connection will auto-reconnect once it wakes up, so this is fine for casual use, just expect a few seconds' delay on the first connection after idle time.

Note: `better-sqlite3` compiles a small native addon during `npm install`. Render's build environment has full internet access and does this automatically — no extra configuration needed.

### 3. Deploy the frontend as a Static Site
**New → Static Site**, same repo, then set:
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_SERVER_URL` = your backend's Render URL (e.g. `https://minigame-hub-backend.onrender.com`)

### 4. Wire them together
Once both are deployed, double check:
- The frontend's `VITE_SERVER_URL` points at the backend.
- The backend's `CLIENT_ORIGIN` points at the frontend (no trailing slash).
Redeploy either side after changing env vars (Render does this automatically on env var save, or trigger manually).

That's it — visit the static site URL and you should be able to host and join games.

### Persisting data across deploys
The free tier's filesystem is ephemeral, so the SQLite file (and therefore leaderboards/match history) resets on every backend redeploy. If you want stats to persist long-term, attach a Render Disk to the backend service (paid) mounted at `backend/data`, or swap `better-sqlite3` for a managed Postgres add-on — the `db.ts` module is the only file that would need to change.

## Settings & accessibility

- **Reduced motion** (Settings page) strips transitions/animations app-wide via a body class, on top of respecting the OS-level `prefers-reduced-motion` setting automatically.
- **Sound** toggle controls short procedurally-generated beep cues (no audio assets to manage).
- **Notifications** toggle controls toast pop-ups; game invites always show regardless (so you don't accidentally miss a friend's invite), but you can decline/ignore them.
