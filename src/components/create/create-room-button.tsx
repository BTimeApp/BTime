"use client";

import { useSocket } from "@/hooks/useSocket";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { IRoomSettings } from "@/types/room";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { Socket } from "socket.io-client";
import { IUser } from "@/types/user";

export default function CreateRoomButton({
  roomSettings,
  socket,
  user,
}: {
  roomSettings: IRoomSettings;
  socket: Socket;
  user?: IUser;
}) {
    let active = (user && socket.connected && roomSettings.roomName !== "");
    const handleClick = () => {
        if (!user || !socket.connected) {
            console.log("Create Room Button: No user logged in or socket is not connected.")
            return;
        }

        if (!active) {
            // button cannot be pressed
            return;
        }

        console.log(roomSettings);
        const transportToRoom = (roomId: string) => {
            window.location.href = `/room/${roomId}`;
        }

        socket.emit("create_room", {roomSettings: roomSettings}, transportToRoom);
    }
  return (
    <Button variant={ active ? "primary": "primary_inactive"} size="lg" className={cn("p-0 w-42")} onClick={handleClick}>
        <h1 className="font-bold text-center text-2xl">Create Room</h1>
    </Button>
  );
}
