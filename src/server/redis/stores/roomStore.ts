import { IRoom, RoomRedisEvent } from "@/types/room";
import { Redis } from "ioredis";
import { REDIS_KEY_REGISTRY } from "@/server/redis/key-registry";
import { IRoomSummary, roomToSummary } from "@/types/room-listing-info";
import { RedisLogger } from "@/server/logging/logger";
/**
 * Defines the Redis store for rooms
 *
 *
 * Keys used:
 *  - room:[roomId] -> JSON. JSON for rooms to stay simple and support modifying and querying small parts
 *  - room:[roomId]:events -> Redis list (used as a queue). List of serialized (event name, ...args)
 *  - rooms -> a sorted set of all available rooms by creation/insertion time into redis. members are room IDs.
 */

function roomKey(roomId: string) {
  return ROOM_KEY_PREFIX + roomId;
}

function roomEventKey(roomId: string) {
  return ROOM_KEY_PREFIX + roomId + ":events";
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
      RedisLogger.info({ key }, `Deleting room`);
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
      transaction.del(roomEventKey(roomId));
      transaction.zrem(ROOMS_KEY, roomId);

      await transaction.exec();
    },

    async scheduleRoomForDeletion(roomId: string) {
      RedisLogger.debug({ roomId }, `Schedule room deletion`);

      await redis.expire(roomKey(roomId), ROOM_TIMEOUT_SECONDS);
      await redis.expire(roomEventKey(roomId), ROOM_TIMEOUT_SECONDS);
    },

    async persistRoom(roomId: string) {
      RedisLogger.debug({ roomId }, `Persisting room`);

      await redis.persist(roomKey(roomId));
      await redis.persist(roomEventKey(roomId));
    },

    async getRoomsPage(pageNumber: number, pageSize: number) {
      const start = (pageNumber - 1) * pageSize;
      const stop = start + pageSize - 1;

      //get the newest rooms
      const roomKeys = await redis.zrevrange(ROOMS_KEY, start, stop);

      // Handle empty case
      if (roomKeys.length === 0) {
        const totalRooms = await redis.zcard(ROOMS_KEY);
        const totalPages = Math.max(Math.ceil(totalRooms / pageSize), 1);
        return { roomSummaries: [], totalPages, totalRooms };
      }

      try {
        // keys is an array of key names, path is the JSON path (defaulting to the root '$')
        // The command is called using the client.call() method for custom Redis Stack commands
        const roomStrings = (await redis.call("JSON.MGET", [
          ...roomKeys,
          "$",
        ])) as (string | null)[];
        const missingRoomKeys: string[] = [];

        // we are ok with returning null if there are no rooms
        const roomSummaries = roomStrings
          ?.map((json, idx) => {
            if (!json) {
              // This means the room is missing.
              // This could be the fault of keyspace event pub/sub being best-effort only or other weird behavior
              missingRoomKeys.push(roomKeys[idx]);
              return;
            }
            const parsed = JSON.parse(json)[0];
            return roomToSummary(parsed);
          })
          .filter((val: IRoomSummary | undefined) => val !== undefined);

        //remove missing rooms from redis
        if (missingRoomKeys.length > 0) {
          await redis.zrem(ROOMS_KEY, missingRoomKeys);
        }

        const totalRooms = await redis.zcard(ROOMS_KEY);
        const totalPages = Math.max(Math.ceil(totalRooms / pageSize), 1); //there should always be at least 1 page, even when there are no rooms

        return { roomSummaries, totalPages, totalRooms };
      } catch (error) {
        RedisLogger.error(
          { error },
          "Error fetching JSON data in getRoomsPage"
        );
        throw error;
      }
    },

    /**
     * Pushes an event onto a room's queue.
     * Noop if the room doesn't exist.
     */
    async enqueueRoomEvent(roomEvent: RoomRedisEvent) {
      const { roomId, userId, event, args } = roomEvent;

      const room = await this.getRoom(roomId);
      if (!room) {
        RedisLogger.warn(
          {
            roomId,
          },
          "Tried to push an event to non-existent room redis queue."
        );
        return;
      } else {
        try {
          const eventData = JSON.stringify({
            userId: userId,
            event: event,
            args: args,
          });
          redis.lpush(roomEventKey(roomId), eventData);
        } catch (e) {
          const error = e as Error;
          RedisLogger.error(
            { roomEvent, error: error.message },
            "Error when pushing event data onto room queue"
          );
        }
      }
    },
  };
}

export type RoomStore = Awaited<ReturnType<typeof createRoomStore>>;

REDIS_KEY_REGISTRY.registerKeys([ROOM_KEY_PREFIX, ROOMS_KEY]);
