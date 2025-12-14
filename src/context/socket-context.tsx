"use client";
import { createContext, useContext, useEffect } from "react";
import { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";
import { useSession } from "@/context/session-context";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socket = getSocket();
  const user = useSession();

  useEffect(() => {
    if (user && !socket.connected) {
      socket.connect();
    }
  }, [socket, user]);

  return <SocketContext value={socket}>{children}</SocketContext>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }
  return context;
}
