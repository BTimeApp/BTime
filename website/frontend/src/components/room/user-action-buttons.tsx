import { Button } from "@/components/ui/button";
import { SOCKET_CLIENT } from "@btime/types";
import { useRouter } from "@tanstack/react-router";
import { useCallback } from "react";

interface UserActionButtonProps {
  userId: string;
  className?: string;
  onClick?: () => void;
}

export function BanUserButton({
  userId,
  className,
  onClick,
}: UserActionButtonProps) {
  const router = useRouter();
  const { socket } = router.options.context;

  const banUser = useCallback(() => {
    socket.emit(SOCKET_CLIENT.BAN_USER, { userId });
    onClick?.();
  }, [socket, userId, onClick]);

  return (
    <Button variant="danger" onClick={banUser} className={className}>
      Ban User
    </Button>
  );
}

export function KickUserButton({
  userId,
  className,
  onClick,
}: UserActionButtonProps) {
  const router = useRouter();
  const { socket } = router.options.context;

  const kickUser = useCallback(() => {
    console.log(`Kicking user ${userId}`);
    socket.emit(SOCKET_CLIENT.KICK_USER, { userId });
    onClick?.();
  }, [socket, userId, onClick]);

  return (
    <Button variant="danger" onClick={kickUser} className={className}>
      Kick User
    </Button>
  );
}

export function UnbanUserButton({
  userId,
  className,
  onClick,
}: UserActionButtonProps) {
  const router = useRouter();
  const { socket } = router.options.context;

  const unbanUser = useCallback(() => {
    socket.emit(SOCKET_CLIENT.UNBAN_USER, { userId });
    onClick?.();
  }, [socket, userId, onClick]);

  return (
    <Button variant="danger" onClick={unbanUser} className={className}>
      Unban User
    </Button>
  );
}
