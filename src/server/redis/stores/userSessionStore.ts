import { Redis } from "ioredis";
import { REDIS_KEY_REGISTRY } from "@/server/redis/key-registry";
import { RedisLogger } from "@/server/logging/logger";

/**
 * Defines the Redis store for:
 *  - online user sessions
 *
 * Each user session is defined by a pair (userId, socketId). This allows one user to be logged in on multiple sockets
 *
 * Keys used:
 *  - userSession:[userId] -> a Set of socket IDs (strings)
 */

function userSessionKey(userId: string) {
  return USER_SESSION_KEY_PREFIX + userId;
}

const USER_SESSION_KEY_PREFIX = "userSession:";

export function createUserSessionStore(redis: Redis) {
  return {
    async getUserSessions(userId: string): Promise<Set<string> | null> {
      const data = await redis.smembers(userSessionKey(userId));
      if (Object.keys(data).length === 0) return null;
      return new Set<string>(data);
    },

    async numUserSessions(userId: string): Promise<number> {
      const hasSession: number = await redis.scard(userSessionKey(userId));
      return hasSession;
    },

    async hasUserSession(userId: string, socketId: string): Promise<boolean> {
      const hasSession: number = await redis.sismember(
        userSessionKey(userId),
        socketId
      );
      return hasSession === 0 ? false : true;
    },

    async addUserSession(userId: string, socketId: string): Promise<void> {
      RedisLogger.debug(`addUserSession: user ${userId}, socket ${socketId}`);
      await redis.sadd(userSessionKey(userId), socketId);
    },

    async deleteUserSession(userId: string, socketId: string): Promise<void> {
      RedisLogger.debug(
        `deleteUserSession: user ${userId}, socket ${socketId}`
      );
      await redis.srem(userSessionKey(userId), socketId);
    },

    // removes the key entirely. Useful for cleanup.
    async deleteUserSessions(userId: string): Promise<void> {
      await redis.del(userSessionKey(userId));
    },
  };
}

export type UserSessionStore = ReturnType<typeof createUserSessionStore>;

REDIS_KEY_REGISTRY.registerKey(USER_SESSION_KEY_PREFIX);
