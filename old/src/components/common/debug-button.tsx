"use client";

import { useSocket } from "../../context/socket-context";
import { SOCKET_CLIENT } from "../../../../packages/types/src/socket_protocol";
import { useCallback } from "react";
import { Button } from "../ui/button";

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
