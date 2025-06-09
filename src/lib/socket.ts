import { io, Socket } from "socket.io-client";

// global singleton socket instance
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

export function destroySocket() {
  socket?.disconnect();
  socket = null;
}
