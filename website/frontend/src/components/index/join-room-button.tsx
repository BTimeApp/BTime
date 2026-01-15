"use client";

import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

type JoinRoomButtonProps = {
  roomId: string;
};

export default function JoinRoomButton({ roomId }: JoinRoomButtonProps) {
  const navigate = useNavigate();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        navigate({
          to: "/room/$roomId",
          params: { roomId },
        });
      }}
    >
      Join
    </Button>
  );
}
