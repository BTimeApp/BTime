import type { Redis } from "ioredis";

import { createRoomStore } from "@/redis/stores/roomStore.js";
import { createUserSessionStore } from "@/redis/stores/userSessionStore.js";
import { createUserStore } from "@/redis/stores/userStore.js";

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
