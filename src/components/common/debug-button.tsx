"use client";

import { useSocket } from "@/context/socket-context";
import { SOCKET_CLIENT } from "@/types/socket_protocol";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";

export default function DebugButton() {
  const socket = useSocket();
  const debugCallback = useCallback(() => {
    socket.emit(SOCKET_CLIENT.DEBUG_EVENT);
  }, [socket]);

  return (
    <Button size="sm" variant="reset" onClick={debugCallback}>
      DEBUG
    </Button>
  );
}
