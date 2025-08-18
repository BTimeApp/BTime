import { IRoom } from "@/types/room";
import { createRoom } from "@/lib/room";
import { rooms } from "@/server/server-objects";

async function addTestRooms() {
  for (let i = 1; i < 101; i++) {
    const room: IRoom = await createRoom(
      {
        roomName: "test_room_" + i,
        roomEvent: "333",
        roomFormat: "CASUAL",
        isPrivate: i % 2 == 0,
        password: i % 2 == 0 ? "test" : undefined,
      },
      i.toString()
    );

    rooms.set(room.id, room);
  }
}

export default async function addDevExtras() {
    addTestRooms();
}
