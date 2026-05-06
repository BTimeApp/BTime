import type { IUserInfo } from "@btime/types";
import type { Redis } from "ioredis";

import { RedisLogger } from "@/logging/logger.js";
import { REDIS_KEY_REGISTRY } from "@/redis/key-registry.js";

/**
 * Defines the Redis store for:
 *  - online user info
 *
 * Keys used:
 *  - user:[userId] -> IUserInfo hash
 */

const USER_KEY_PREFIX = "user:";

function userKey(userId: string) {
  return USER_KEY_PREFIX + userId;
}

export function createUserStore(redis: Redis) {
  return {
    async getUser(userId: string): Promise<IUserInfo | null> {
      const data = await redis.hgetall(userKey(userId));
      if (Object.keys(data).length === 0) return null;
      return {
        id: data.id,
        userName: data.userName,
        avatarURL: data.avatarURL || undefined,
        isGuest: data.isGuest === "true",
      };
    },

    // uses the userId field already present as a key
    async setUser(user: IUserInfo): Promise<void> {
      RedisLogger.info({ user }, "setUser");
      await redis.hset(userKey(user.id), {
        id: user.id,
        userName: user.userName,
        avatarURL: user.avatarURL ?? "",
        isGuest: String(user.isGuest),
      });
    },

    async deleteUser(userId: string): Promise<void> {
      RedisLogger.info({ userId }, "Deleting User");
      await redis.del(userKey(userId));
    },
  };
}

export type UserStore = ReturnType<typeof createUserStore>;
REDIS_KEY_REGISTRY.registerKey(USER_KEY_PREFIX);
