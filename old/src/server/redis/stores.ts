import Redis from "ioredis";
import { createUserStore } from "./stores/userStore";
import { createUserSessionStore } from "./stores/userSessionStore";
import { createRoomStore } from "./stores/roomStore";

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
