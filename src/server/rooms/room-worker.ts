import { Server as SocketIOServer } from "socket.io";
import { ServerLogger } from "@/server/logging/logger";
import { RoomProcessor } from "@/server/rooms/room-processor";
import { RedisStores } from "@/server/redis/stores";
import Redis from "ioredis";

export class RoomWorker {
  private redis: Redis;
  private stores: RedisStores;
  private io: SocketIOServer;
  /**
   * Mapping of roomId : room processor that this server owns.
   * Each server instance owns all the rooms that it creates (when it receives a CREATE_ROOM event)
   */
  private processors: Map<string, RoomProcessor> = new Map();

  constructor(redis: Redis, stores: RedisStores, io: SocketIOServer) {
    this.redis = redis;
    this.stores = stores;
    this.io = io;

    ServerLogger.info("Starting global RoomWorker...");
    // Graceful shutdown
    process.on("SIGTERM", () => this.shutdown());
    process.on("SIGINT", () => this.shutdown());
  }

  /**
   *
   */
  startRoomProcessor(roomId: string) {
    if (this.processors.has(roomId)) {
      ServerLogger.warn(
        { roomId },
        "Room processor already exists for given roomid"
      );
      return;
    }

    const processor = new RoomProcessor(
      roomId,
      this.redis,
      this.stores,
      this.io
    );
    this.processors.set(roomId, processor);
  }

  stopRoomProcessor(roomId: string) {
    const processor = this.processors.get(roomId);
    if (processor) {
      processor.stop();
      this.processors.delete(roomId);
      ServerLogger.debug({ roomId }, "Stopping room processor");
    } else {
      ServerLogger.warn(
        { roomId },
        "Tried to stop a room processor that doesn't exist."
      );
    }
  }

  private async shutdown() {
    ServerLogger.info("Room worker shutting down.");

    for (const processor of this.processors.values()) {
      processor.stop();
    }
  }
}
