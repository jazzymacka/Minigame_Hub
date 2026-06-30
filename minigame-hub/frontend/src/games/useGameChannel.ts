import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";

/**
 * Common plumbing every game component needs: subscribe to the
 * authoritative `game:state` blob, listen for one-off `game:event`
 * notices (round starts, reveals, etc.), and get a typed helper to
 * send player actions back to the server.
 */
export function useGameChannel<TState = unknown, TEvent = { type: string; [k: string]: unknown }>() {
  const { socket } = useSocket();
  const [state, setState] = useState<TState | null>(null);
  const [lastEvent, setLastEvent] = useState<TEvent | null>(null);
  const eventLog = useRef<TEvent[]>([]);

  useEffect(() => {
    const onState = (s: TState) => setState(s);
    const onEvent = (e: TEvent) => {
      setLastEvent(e);
      eventLog.current = [...eventLog.current.slice(-49), e];
    };
    socket.on("game:state", onState);
    socket.on("game:event", onEvent);
    return () => {
      socket.off("game:state", onState);
      socket.off("game:event", onEvent);
    };
  }, [socket]);

  function sendAction(action: string, payload?: unknown) {
    socket.emit("game:action", { action, payload });
  }

  return { state, lastEvent, eventLog: eventLog.current, sendAction };
}
