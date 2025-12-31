import { Server as SocketIOServer } from "socket.io";
import Redis from "ioredis";
import { RoomLogger } from "@/server/logging/logger";
import { RoomRedisEvent } from "@/types/room";
import { RedisStores } from "@/server/redis/stores";
import {
  isRoomEventKey,
  ROOM_EVENT_HANDLERS,
} from "@/server/rooms/room-event-handlers";

export class RoomProcessor {
  private roomId: string;
  // private redis: Redis;
  private blockingRedis: Redis;
  private stores: RedisStores;
  private io: SocketIOServer;
  private running: boolean = false;

  constructor(
    roomId: string,
    redis: Redis,
    stores: RedisStores,
    io: SocketIOServer
  ) {
    this.roomId = roomId;
    // this.redis = redis;
    // to make use of BRPOP without blocking redis for other uses, we have to make another connection
    this.blockingRedis = redis.duplicate();
    this.stores = stores;
    this.io = io;
    this.start();
  }

  getRunning() {
    return this.running;
  }

  /**
   * Starts the room processor. This is an infinite loop of trying to read from the appropriate room event queue in redis.
   * Automatically started on construction, but can be restarted manually by calling this function.
   */
  start() {
    this.running = true;
    RoomLogger.debug({ roomId: this.roomId }, "Starting room processor");
    this.processLoop();
  }

  private async processLoop() {
    while (this.running) {
      try {
        // blocking pop from queue with periodic timeout to check room health
        const result = await this.blockingRedis.brpop(
          `room:${this.roomId}:events`,
          30
        );

        if (result) {
          const eventJson = result[1];
          const roomRedisEvent: RoomRedisEvent = JSON.parse(eventJson);

          await this.handleEvent(roomRedisEvent);
        }

        const room = await this.stores.rooms.getRoom(this.roomId);
        if (room == null) {
          this.running = false;
        }
      } catch (error) {
        RoomLogger.error(
          { roomId: this.roomId, error: (error as Error).message },
          "Room processor encountered error"
        );
      }
    }
  }

  /**
   * Main handler function for the room processor.
   */
  private async handleEvent(event: RoomRedisEvent) {
    if (!isRoomEventKey(event.event)) {
      RoomLogger.error(
        { event },
        "Received unknown or non-room event in room processor"
      );
      return;
    }

    const handler = ROOM_EVENT_HANDLERS[event.event];

    await handler(this.io, this.stores, event.roomId, event.userId, event.args);
  }

  stop() {
    RoomLogger.info({ roomId: this.roomId }, "Stopping room processor");
    this.running = false;
  }
}
