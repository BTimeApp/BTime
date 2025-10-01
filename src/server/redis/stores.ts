import Redis from "ioredis";
import { createUserStore } from "@/server/redis/stores/userStore";
import { createUserSessionStore } from "@/server/redis/stores/userSessionStore";
import { createRoomStore } from "@/server/redis/stores/roomStore";

export async function createStores(redis: Redis) {
  const pubClient = redis;
  const subClient = redis.duplicate();
  await subClient.config("SET", "notify-keyspace-events", "Ex");

  return {
    pubClient: pubClient,
    subClient: subClient,
    users: createUserStore(pubClient),
    rooms: await createRoomStore(pubClient, subClient),
    userSessions: createUserSessionStore(pubClient),
    // add in more data stores here
  };
}

export type RedisStores = Awaited<ReturnType<typeof createStores>>;
