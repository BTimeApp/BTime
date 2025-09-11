import { useEffect } from "react";
import { Socket } from "socket.io-client";

/**
 * A generic hook for attaching listeners (on the client side) for socket events coming in from the server.
 *  - socket: the socket.io-client Socket instance
 *  - event: the event name to listen for
 *  - handler: the event handler to be triggered/called (make sure the args line up with what's expected based on the server's callsite). Should basically ALWAYS be a useCallback() hook to avoid many reattaches
 *  - active: control when this listener is active (can pass in a conditional). By default, listener is always there.
 *  - once: if we listen for this event only once or not
 */
export function useSocketEvent(
  socket: Socket,
  event: string,
  handler: (...args: any[]) => void, //eslint-disable @typescript-eslint/no-explicit-any
  active: boolean = true,
  once: boolean = false
) {
  useEffect(() => {
    if (!socket || !active) return;

    console.log(`Attaching socket event ${event}: ${handler}}`);

    if (once) socket.once(event, handler);
    else socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler, active, once]);
}
