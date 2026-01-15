import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SOCKET_CLIENT } from "@btime/types";
import { useRouter } from "@tanstack/react-router";

interface TeamButtonProps {
  teamId: string;
  className?: string;
}

export function JoinTeamButton({ teamId, className }: TeamButtonProps) {
  const router = useRouter();
  const { socket } = router.options.context;
  return (
    <Button
      variant="primary"
      className={cn("h-6 font-bold", className)}
      onClick={() => {
        socket.emit(SOCKET_CLIENT.JOIN_TEAM, { teamId: teamId });
      }}
    >
      Join
    </Button>
  );
}

export function LeaveTeamButton({ teamId, className }: TeamButtonProps) {
  const router = useRouter();
  const { socket } = router.options.context;
  return (
    <Button
      variant="destructive"
      className={cn("h-6 font-bold", className)}
      onClick={() => {
        socket.emit(SOCKET_CLIENT.LEAVE_TEAM, { teamId });
      }}
    >
      Leave
    </Button>
  );
}

export function DeleteTeamButton({ teamId, className }: TeamButtonProps) {
  const router = useRouter();
  const { socket } = router.options.context;
  return (
    <Button
      variant="destructive"
      className={cn("h-6 font-bold", className)}
      onClick={() => {
        socket.emit(SOCKET_CLIENT.DELETE_TEAM, { teamId });
      }}
    >
      Delete Team
    </Button>
  );
}
