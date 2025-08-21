"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
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
  const { user } = useSession();

  const onDisconnect = useCallback(() => {
    socket.close();
    setSocketConnected(false);
  }, [socket]);

  useEffect(() => {
    const onConnect = () => setSocketConnected(true);

    if (user && !socket.connected) {
      socket.connect();
      socket.on("connect", onConnect);
    }

    return () => {
      socket.off("connect", onConnect);
    };
  }, [socket, user]);

  useEffect(() => {
    window.addEventListener("beforeunload", onDisconnect);
  }, [onDisconnect]);

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
