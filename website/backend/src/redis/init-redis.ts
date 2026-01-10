import { Redis, Redis as RedisInterface } from "ioredis";
import { RedisLogger } from "@/logging/logger.js";

// https://stackoverflow.com/questions/70805943/redis-redis-createclient-in-typescript
declare module "ioredis" {
  interface Redis {
    /**
     * Enqueue a room event if the room exists.
     * @param roomKey Redis key for the room JSON object
     * @param queueKey Redis key for the room queue list
     * @param payload JSON-stringified event data
     * @returns 1 if enqueued, 0 if room does not exist
     */
    enqueueRoomEvent(
      roomKey: string,
      queueKey: string,
      payload: string
    ): Promise<number>;
  }
}

export const connectToRedis = async () => {
  // connect to Redis
  if (!process.env.REDIS_URI)
    throw new Error("No Redis URI defined in environment variables.");

  /**
   * Use:
   *  - pubClient for publishing to events
   *  - subClient for subscribing to events
   *  - dataClient for doing general read/write work
   */
  const pubClient = new Redis(process.env.REDIS_URI);
  const subClient = pubClient.duplicate();
  const dataClient = pubClient.duplicate();

  //in ioredis, we don't need a connect() call. Redis handles for us

  RedisLogger.info("Connected to Redis.");

  // pubClient, subClient for pub/sub use with socket.io. Use storeClient to read and write to the redis store.
  return { pubClient, subClient, dataClient };
};
