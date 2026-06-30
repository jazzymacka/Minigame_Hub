import { useEffect, useRef, useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import type { ChatMessage } from "../../types";

export default function ChatPanel({ initialMessages, lobbyId }: { initialMessages: ChatMessage[]; lobbyId: string }) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [lobbyId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onMessage = (msg: ChatMessage) => setMessages((m) => [...m, msg]);
    const onState = (lobby: { id: string; chat: ChatMessage[] }) => {
      if (lobby.id === lobbyId) setMessages(lobby.chat);
    };
    socket.on("lobby:chatMessage", onMessage);
    socket.on("lobby:state", onState);
    return () => {
      socket.off("lobby:chatMessage", onMessage);
      socket.off("lobby:state", onState);
    };
  }, [socket, lobbyId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    socket.emit("lobby:chat", { text: trimmed });
    setText("");
  }

  return (
    <div className="card-surface flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MessageSquare size={15} className="text-accent" />
        <h3 className="font-display text-sm font-semibold text-ink">Lobby Chat</h3>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3" style={{ maxHeight: 320, minHeight: 180 }}>
        {messages.map((m) => (
          <div key={m.id} className="animate-fade-in text-sm">
            {m.type === "message" ? (
              <p>
                <span className="font-medium text-ink">{m.author}: </span>
                <span className="text-ink-muted">{m.text}</span>
              </p>
            ) : (
              <p className="text-xs italic text-ink-faint">{m.text}</p>
            )}
          </div>
        ))}
        {messages.length === 0 && <p className="text-xs text-ink-faint">No messages yet. Say hi!</p>}
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <input
          className="input-field"
          placeholder="Type a message…"
          value={text}
          maxLength={280}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn-secondary !px-3" onClick={send} aria-label="Send">
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
