import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import { apiRouter } from "./routes/api.js";
import { registerSocketHandlers } from "./sockets/index.js";

const PORT = Number(process.env.PORT) || 4000;

// Final safety net: game round-timers and ticks (snake/pong simulation,
// trivia/colour-reflex round advances, etc.) run as plain setTimeout/
// setInterval callbacks outside of any socket event handler, so they aren't
// covered by the per-socket try/catch in sockets/index.ts. Without this,
// any bug in a game module's timer-driven code would crash the entire
// process and disconnect every player. We log and keep running instead.
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (server kept running):", err);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection (server kept running):", err);
});

// CLIENT_ORIGIN can be a single URL or a comma-separated list (useful if you
// have both a production and a preview frontend URL). If unset, we fall back
// to reflecting whatever origin made the request — convenient for local dev
// and for getting a first deploy working, though for production you should
// set CLIENT_ORIGIN explicitly to your real frontend URL.
const rawOrigins = process.env.CLIENT_ORIGIN;
const allowedOrigins = rawOrigins ? rawOrigins.split(",").map((o) => o.trim()) : null;
const corsOrigin = allowedOrigins ?? true;

const app = express();
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use("/api", apiRouter);
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "Minigame Hub backend is running. This is an API/Socket.IO server — there's no page here. Point your frontend's VITE_SERVER_URL at this URL.",
  });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: corsOrigin, credentials: true },
});

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Minigame Hub backend listening on port ${PORT}`);
  console.log(`Allowed client origin(s): ${allowedOrigins ? allowedOrigins.join(", ") : "(reflecting any origin — set CLIENT_ORIGIN for production)"}`);
});
