import { IRoom } from "@/types/room";
import { Redis } from "ioredis";
import { REDIS_KEY_REGISTRY } from "@/server/redis/key-registry";
import { roomToSummary } from "@/types/room-listing-info";
/**
 * Defines the Redis store for rooms
 *
 *
 * Keys used:
 *  - room:[roomId] -> JSON. JSON for rooms to stay simple and support modifying and querying small parts
 *  - rooms -> a sorted set of all available rooms by creation/insertion time into redis. members are room IDs.
 */

function roomKey(roomId: string) {
  return ROOM_KEY_PREFIX + roomId;
}

const ROOMS_KEY = "rooms";
const ROOM_KEY_PREFIX = "room:";

// the default time a room will exist without a user joining (after the last leave). rooms created empty may exist (but should never happen)
const ROOM_TIMEOUT_SECONDS = 5;

export async function createRoomStore(redis: Redis, subClient: Redis) {
  await subClient.subscribe("__keyevent@0__:expired");

  // attach listener to delete room keys from the rooms set when the actual room object expires
  subClient.on("message", async (channel, key) => {
    if (
      channel === "__keyevent@0__:expired" &&
      key.startsWith(ROOM_KEY_PREFIX)
    ) {
      console.log(`Room ${key} has expired. Deleting.`)
      await redis.zrem(ROOMS_KEY, key);
    }
  });

  return {
    // creates a room in the room store and returns it
    async setRoom(room: IRoom) {
      await redis.call("JSON.SET", roomKey(room.id), "$", JSON.stringify(room));

      // only insert into the rooms set if new key
      const score = await redis.zscore(ROOMS_KEY, roomKey(room.id));
      if (score == null) {
        await redis.zadd(ROOMS_KEY, Date.now(), roomKey(room.id));
      }
    },

    // get the entire current room state from room store
    async getRoom(roomId: string): Promise<IRoom | null> {
      const jsonString = await redis.call("JSON.GET", roomKey(roomId), "$");
      if (!jsonString) return null;

      return JSON.parse(jsonString as string)[0];
    },

    async getRoomProp(roomId: string, prop: string) {
      const jsonString = await redis.call(
        "JSON.GET",
        roomKey(roomId),
        `$.${prop}`
      );
      if (!jsonString) return null;

      return JSON.parse(jsonString as string)[0];
    },

    // pass in a generic update function. assumes the room object is edited in place.
    // this function assumes that the room's ID doesn't change.
    async updateRoomFunction(
      roomId: string,
      updateFunction: (room: IRoom) => void
    ) {
      const room = await this.getRoom(roomId);
      if (!room) return;

      updateFunction(room);
      await this.setRoom(room);
    },

    // Deletion option just to be complete. Be careful when using. Use the automatic deletion when we can
    async deleteRoom(roomId: string) {
      const transaction = redis.multi();
      transaction.del(roomKey(roomId));
      transaction.zrem(ROOMS_KEY, roomId);

      await transaction.exec();
    },

    async scheduleRoomForDeletion(roomId: string) {
      await redis.expire(roomKey(roomId), ROOM_TIMEOUT_SECONDS);
    },

    async persistRoom(roomId: string) {
      console.log("Persisting room", roomId);
      await redis.persist(roomKey(roomId));
    },

    async getRoomsPage(pageNumber: number, pageSize: number) {
      const start = (pageNumber - 1) * pageSize;
      const stop = start + pageSize - 1;

      //get the newest rooms
      const roomKeys = await redis.zrevrange(ROOMS_KEY, start, stop);

      const transaction = redis.multi();
      for (const roomKey of roomKeys) {
        transaction.call("JSON.GET", roomKey, "$");
      }
      const roomStrings = await transaction.exec();

      // we are ok with returning null if there are no rooms
      const roomSummaries = roomStrings?.map(([err, json]) => {
        if (err) throw err;
        // This means the room is missing. This could be the fault of keyspace event pub/sub being best-effort only
        if (!json) return;
        const parsed = JSON.parse(json as string)[0];
        return roomToSummary(parsed);
      });

      const totalRooms = await redis.zcard(ROOMS_KEY);
      const totalPages = Math.max(Math.ceil(totalRooms / pageSize), 1); //there should always be at least 1 page, even when there are no rooms

      return { roomSummaries, totalPages, totalRooms };
    },
  };
}

export type RoomStore = Awaited<ReturnType<typeof createRoomStore>>;

REDIS_KEY_REGISTRY.registerKeys([ROOM_KEY_PREFIX, ROOMS_KEY]);
