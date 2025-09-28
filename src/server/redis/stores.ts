import Redis from "ioredis";
import { createUserStore } from "@/server/redis/stores/userStore";
import { createUserSessionStore } from "@/server/redis/stores/userSessionStore";

export function createStores(redis: Redis) {
  const client = redis;

  return {
    users: createUserStore(client),
    userSessions: createUserSessionStore(client),
    // add in more data stores here
  };
}

export type RedisStores = ReturnType<typeof createStores>
