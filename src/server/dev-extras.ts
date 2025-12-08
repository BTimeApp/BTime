import {
  Access,
  IRoom,
  RaceSettings,
  TeamFormatSettings,
  TeamSettings,
} from "@/types/room";
import { createRoom } from "@/lib/room";
import { RedisStores } from "@/server/redis/stores";

async function addTestRooms(stores: RedisStores) {
  for (let i = 30; i > 0; i--) {
    const room: IRoom = await createRoom(
      {
        roomName: "test_room_" + i,
        roomEvent: "333",
        access: (i % 2 == 0
          ? {
              visibility: "PUBLIC",
            }
          : { visibility: "PRIVATE", password: "test" }) as Access,
        raceSettings: (i % 2 == 0
          ? {
              roomFormat: "CASUAL",
            }
          : {
              roomFormat: "RACING",
              matchFormat: "BEST_OF",
              nSets: 3,
              setFormat: "BEST_OF",
              nSolves: 7,
            }) as RaceSettings,
        teamSettings: (i % 3 == 0
          ? {
              teamsEnabled: true,
              teamFormatSettings: (i % 6 == 0 ? {
                teamSolveFormat: "ONE",
              } : {
                teamSolveFormat: "ALL",
                teamReduceFunction: "SUM",
                teamScrambleFormat: "SAME",
              }) as TeamFormatSettings,
            }
          : { teamsEnabled: false }) as TeamSettings,
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
  };

  // attach redis cleanup upon server close - this should only be done in local dev environments
  process.on("SIGINT", handleServerClose);
  process.on("SIGTERM", handleServerClose);
}
