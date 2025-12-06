"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";
import { useSession } from "@/context/session-context";

interface SocketContextValue {
  socket: Socket;
  socketConnected: boolean;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socket = getSocket();
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const user = useSession();

  useEffect(() => {
    const onConnect = () => {
      setSocketConnected(true);
    };

    const onDisconnect = () => {
      setSocketConnected(false);
    };

    window.addEventListener("beforeunload", onDisconnect);

    if (user && !socket.connected) {
      socket.connect();
      socket.on("connect", onConnect);
    }

    return () => {
      socket.off("connect", onConnect);
      onDisconnect();
      window.removeEventListener("beforeunload", onDisconnect);
    };
  }, [socket, user]);

  return (
    <SocketContext value={{ socket, socketConnected }}>
      {children}
    </SocketContext>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }
  return context;
}
