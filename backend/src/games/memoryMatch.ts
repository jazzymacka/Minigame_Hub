import type { ServerGameModule } from "../types.js";

const ICONS = ["🍎", "🍌", "🍇", "🍒", "🥝", "🍉", "🍋", "🍓", "🥑", "🍍", "🍑", "🥥"];

function buildDeck(pairCount: number) {
  const icons = ICONS.slice(0, pairCount);
  const deck = [...icons, ...icons];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

interface PlayerBoard {
  deck: string[];
  matched: boolean[];
  flipped: number[]; // currently face-up, unmatched (max 2)
  startedAt: number;
  finishedAt: number | null;
}

interface MemoryState {
  boards: Record<string, PlayerBoard>;
}

const memoryMatch: ServerGameModule = {
  id: "memory-match",
  name: "Memory Match",
  description: "Flip cards to find every matching pair. Lowest completion time wins.",
  icon: "🧠",
  minPlayers: 2,
  maxPlayers: 6,
  estimatedMatchLength: "1-3 min",

  onStart(ctx) {
    const boards: MemoryState["boards"] = {};
    for (const p of ctx.lobby.players) {
      const deck = buildDeck(8);
      boards[p.id] = { deck, matched: new Array(deck.length).fill(false), flipped: [], startedAt: Date.now(), finishedAt: null };
    }
    ctx.setState({ boards } as MemoryState);
    ctx.emitToLobby("game:event", { type: "memory:start", cardCount: 16 });
  },

  onAction(ctx, playerId, action, payload) {
    if (action !== "flip") return;
    const s = ctx.getState<MemoryState>();
    const board = s.boards[playerId];
    if (!board || board.finishedAt !== null) return;
    const { index } = payload as { index: number };
    if (board.matched[index] || board.flipped.includes(index)) return;
    if (board.flipped.length >= 2) board.flipped = [];

    board.flipped.push(index);
    if (board.flipped.length === 2) {
      const [a, b] = board.flipped;
      if (board.deck[a] === board.deck[b]) {
        board.matched[a] = true;
        board.matched[b] = true;
        board.flipped = [];
        if (board.matched.every(Boolean)) {
          board.finishedAt = Date.now();
        }
      }
    }
    ctx.setState(s);
    ctx.emitState();

    if (board.finishedAt !== null) {
      const allDone = ctx.lobby.players.every((p) => s.boards[p.id]?.finishedAt !== null);
      if (allDone) {
        const ranked = ctx.lobby.players
          .map((p) => ({ id: p.id, username: p.username, timeMs: s.boards[p.id].finishedAt! - s.boards[p.id].startedAt }))
          .sort((a, b) => a.timeMs - b.timeMs);
        ctx.finishMatch({
          players: ranked.map((r, i) => ({ id: r.id, username: r.username, score: Math.max(0, 60000 - r.timeMs), place: i + 1, timeMs: r.timeMs })),
        });
      }
    }
  },
};

export default memoryMatch;
