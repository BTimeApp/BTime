"use client";

import { SOCKET_CLIENT } from "@btime/types";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@tanstack/react-router";

export default function DebugButton() {
  const router = useRouter();
  const { socket } = router.options.context;
  const debugCallback = useCallback(() => {
    if (socket.connected) {
      socket.emit(SOCKET_CLIENT.DEBUG_EVENT);
    }
  }, [socket]);

  return (
    <Button size="sm" variant="reset" onClick={debugCallback}>
      DEBUG
    </Button>
  );
}
