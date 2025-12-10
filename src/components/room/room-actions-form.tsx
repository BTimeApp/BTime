import { Button } from "@/components/ui/button";
import { useRoomStore } from "@/context/room-context";
import { useSocket } from "@/context/socket-context";
import { SOCKET_CLIENT } from "@/types/socket_protocol";
import { useCallback } from "react";
import RoomUserDialog from "@/components/room/room-user-dialog";
import { useSession } from "@/context/session-context";

interface RoomActionsFormProps {
  onSubmitCallback: () => void;
}

export default function RoomActionsForm({
  onSubmitCallback,
}: RoomActionsFormProps) {
  const users = useRoomStore((s) => s.users);
  const isUserHost = useRoomStore((s) => s.isUserHost);

  const user = useSession();
  const { socket } = useSocket();

  const resetRoom = useCallback(() => {
    if (socket) {
      socket.emit(SOCKET_CLIENT.RESET_ROOM);
      onSubmitCallback();
    }
  }, [socket, onSubmitCallback]);

  const forceNextSolve = useCallback(() => {
    if (socket) {
      socket.emit(SOCKET_CLIENT.FORCE_NEXT_SOLVE);
      onSubmitCallback();
    }
  }, [socket, onSubmitCallback]);

  if (!socket || !socket.connected) {
    return (
      <div>
        <p>You are not connected to the socket.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-2">
      <div className="flex flex-col flex-1 gap-2 items-center">
        <Button onClick={resetRoom} variant="danger" className="w-fit">
          Reset Room
        </Button>
        <Button onClick={forceNextSolve} variant="danger" className="w-fit">
          Force Next Solve
        </Button>
      </div>
      <div className="flex flex-col flex-1 ">
        <div className="text-lg text-center">Banned Users</div>
        {Object.values(users)
          .filter((roomUser) => roomUser.banned)
          .map((roomUser, idx) => (
            <RoomUserDialog
              key={idx}
              user={roomUser}
              hostView={isUserHost(user?.userInfo.id)}
            >
              <div className="hover:scale-105 hover:font-bold hover:underline">
                {roomUser.user.userName}
              </div>
            </RoomUserDialog>
          ))}
      </div>
    </div>
  );
}
