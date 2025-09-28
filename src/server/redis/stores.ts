import Redis from "ioredis";
import { createUserStore } from "@/server/redis/stores/userStore";
import { createUserSessionStore } from "@/server/redis/stores/userSessions";

export function createStores(redis: Redis) {
  const client = redis;

  return {
    users: createUserStore(client),
    userSessions: createUserSessionStore(client),
    // add in more user stores as we need to store more data
  };
}

export type RedisStores = ReturnType<typeof createStores>
