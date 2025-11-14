import { Button } from "@/components/ui/button";
import { useRoomStore } from "@/context/room-context";
import { useSession } from "@/context/session-context";
import { useSocket } from "@/context/socket-context";
import { SOCKET_CLIENT, SocketResponse } from "@/types/socket_protocol";
import { useCallback } from "react";
import { toast } from "sonner";

interface JoinTeamButtonProps {
  teamId: string;
}

interface LeaveTeamButtonProps {
  teamId: string;
}

export function JoinTeamButton({ teamId }: JoinTeamButtonProps) {
  const { socket } = useSocket();
  const joinTeamCallback = useCallback((response: SocketResponse<void>) => {
    if (!response.success) {
      toast.error(response.reason);
    }
  }, []);
  return (
    <Button
      variant="primary"
      className="h-6"
      onClick={() => {
        socket.emit(SOCKET_CLIENT.JOIN_TEAM, teamId, joinTeamCallback);
      }}
    >
      Join
    </Button>
  );
}

export function LeaveTeamButton({ teamId }: LeaveTeamButtonProps) {
    const { socket } = useSocket();
    const leaveTeamCallback = useCallback((response: SocketResponse<void>) => {
      if (!response.success) {
        toast.error(response.reason);
      }
    }, []);
    return (
      <Button
        variant="primary"
        className="h-6"
        onClick={() => {
          socket.emit(SOCKET_CLIENT.LEAVE_TEAM, teamId, leaveTeamCallback);
        }}
      >
        Leave
      </Button>
    );
}
