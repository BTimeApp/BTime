"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";
import { useSession } from "@/context/session-context";
import { SOCKET_CLIENT } from "@/types/socket_protocol";

interface SocketContextValue {
  socket: Socket;
  socketConnected: boolean;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socket = getSocket();
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const { user } = useSession();

  useEffect(() => {
    // emit heartbeat every 5 seconds
    const heartbeatInterval = setInterval(() => {
      socket.emit(SOCKET_CLIENT.ROOM_HEARTBEAT);
    }, 5000);

    const onConnect = () => {
      setSocketConnected(true);
    }

    const onDisconnect = () => {
      setSocketConnected(false);
      clearInterval(heartbeatInterval);
    }

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
