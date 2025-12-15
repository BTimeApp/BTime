import { io, Socket } from "socket.io-client";

/**
 * Set up a simple global singleton socket instance.
 * Meant to exist outside of React state so that we can persist the socket instance through re-renders
 * Removed the destroy function - upon window close or otherwise a connection issue, the socket will be disconnected automatically
 */
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io("", {
      autoConnect: false,
      withCredentials: true,
    });
  }

  return socket;
}
