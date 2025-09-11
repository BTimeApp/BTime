import { Button } from "@/components/ui/button";
import { useSocket } from "@/context/socket-context";
import { SOCKET_CLIENT } from "@/types/socket_protocol";
import { useCallback } from "react";

interface RoomActionsFormProps {
    onSubmitCallback: () => void;
}

export default function RoomActionsForm({onSubmitCallback}: RoomActionsFormProps) {
  const { socket } = useSocket();

  const resetRoom = useCallback(() => {
    if (socket) {
      socket.emit(SOCKET_CLIENT.RESET_ROOM);
      onSubmitCallback();
    }
  }, [socket]);

  const forceNextSolve = useCallback(() => {
    if (socket) {
        socket.emit(SOCKET_CLIENT.FORCE_NEXT_SOLVE);
        onSubmitCallback();
      }
  }, [socket]);

  if (!socket || !socket.connected) {
    return <div>
        <p>You are not connected to the socket.</p>
    </div>
  }

  return (
    <div className="flex flex-col gap-2 w-fit">
      <Button onClick={resetRoom} variant="danger">Reset Room</Button>
      <Button onClick={forceNextSolve} variant="danger">Force Next Solve</Button>
    </div>
  );
}
