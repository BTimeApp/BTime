import { Redis } from "ioredis";

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
  return `userSession:${userId}`;
}

export function createUserSessionStore(redis: Redis) {
  return {
    async getUserSessions(userId: string): Promise<Set<string> | null> {
      const data = await redis.smembers(userSessionKey(userId));
      if (Object.keys(data).length === 0) return null;
      return new Set<string>(data);
    },

    async numUserSessions(userId: string): Promise<number> {
        const hasSession: number = await redis.scard(
          userSessionKey(userId)
        );
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
      await redis.sadd(userSessionKey(userId), socketId);
    },

    async deleteUserSession(userId: string, socketId: string): Promise<void> {
      await redis.srem(userSessionKey(userId), socketId);
    },

    // removes the key entirely. Useful for cleanup.
    async deleteUserSessions(userId: string): Promise<void> {
      await redis.del(userSessionKey(userId));
    },
  };
}

export type UserSessionStore = ReturnType<typeof createUserSessionStore>;
