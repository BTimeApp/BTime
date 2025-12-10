import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericFunc = (...args: any[]) => void;

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
  handler: GenericFunc,
  active: boolean = true,
  once: boolean = false
) {
  const handlerRef = useRef<GenericFunc>(handler);

  // Update ref when handler changes (without re-registering)
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket || !active) return;

    // Wrapper that always calls the latest handler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventHandler = (...args: any[]) => {
      if (process.env.NODE_ENV === "development") {
        console.debug(`Handling event ${event} with args ${args}`);
      }
      handlerRef.current(...args);
    };

    if (once) socket.once(event, eventHandler);
    else socket.on(event, eventHandler);

    return () => {
      socket.off(event, eventHandler);
    };
  }, [socket, event, active, once]);
}
