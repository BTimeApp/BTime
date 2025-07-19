"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";

interface SocketContextValue {
  socket: Socket;
  socketConnected: boolean;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socket = getSocket();
  const [socketConnected, setSocketConnected] = useState(socket.connected);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onConnect = () => setSocketConnected(true);
    socket.on("connect", onConnect);

    return () => {
      socket.off("connect", onConnect);
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, socketConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }
  return context;
}
