import { getSocket } from "@/lib/socket";
import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";

export function useSocket(autoConnect: boolean = true) {
  const [ready, setReady] = useState(false);
  const socket: Socket = getSocket();

  useEffect(() => {
    if (autoConnect && !socket.connected) {
      socket.connect();
    }

    const handleConnect = () => setReady(true);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
      //no disconnect here - explicitly call destroySocket() in lib/socket.ts
    };
  }, [autoConnect]);

  return {
    socket,
    socketConnected: socket.connected,
    isReady: ready,
  };
};