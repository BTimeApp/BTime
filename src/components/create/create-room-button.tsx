"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IRoomSettings } from "@/types/room";
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
    const active = (user && socket.connected && roomSettings.roomName !== "");
    const handleClick = () => {
        if (!user || !socket.connected) {
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

    let errorText = "";
    if (!user) {
      errorText = "User must be logged in."
    } else if (roomSettings.roomName == "") {
      errorText = "Room name cannot be empty.";
    }
  return (
    <>
      <Button variant={ active ? "primary": "primary_inactive"} size="lg" className={cn("p-0 w-42")} onClick={handleClick}>
          <h1 className="font-bold text-center text-2xl">Create Room</h1>
      </Button>
      <div className="text-sm text-error">
        {errorText}
      </div>
    </>
  );
}
