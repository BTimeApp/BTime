"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type JoinRoomButtonProps = {
  roomId: string;
};

export default function JoinRoomButton({ roomId }: JoinRoomButtonProps) {
  return (
    <Link href={`/room/${roomId}`}>
      <Button variant="outline" size="sm">
        Join
      </Button>
    </Link>
  );
}
