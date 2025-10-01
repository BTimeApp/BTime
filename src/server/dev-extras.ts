import { IRoom } from "@/types/room";
import { createRoom } from "@/lib/room";
import { RedisStores } from "@/server/redis/stores";

async function addTestRooms(stores: RedisStores) {
  for (let i = 1; i < 31; i++) {
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

    await stores.rooms.setRoom(room);
  }
}

export default async function addDevExtras(stores: RedisStores) {
    addTestRooms(stores);

    const handleServerClose = async () => {
      console.log("Cleaning up Redis before exit...");
      await stores.pubClient.flushdb(); // deletes all keys in the current DB
      await stores.pubClient.quit();
      process.exit(0);
    }

    // attach redis cleanup upon server close - this should only be done in local dev environments
    process.on("SIGINT", handleServerClose);
    process.on("SIGTERM", handleServerClose);
}
