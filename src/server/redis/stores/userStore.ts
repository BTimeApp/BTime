import { Redis } from "ioredis";
import { IUserInfo } from "@/types/user";

/**
 * Defines the Redis store for:
 *  - online user info
 *
 * Keys used:
 *  - user:[userId] -> IUserInfo hash
 */

function userKey(userId: string) {
  return `user:${userId}`;
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
      };
    },

    // uses the userId field already present as a key
    async setUser(user: IUserInfo): Promise<void> {
      await redis.hset(userKey(user.id), {
        id: user.id,
        userName: user.userName,
        avatarURL: user.avatarURL ?? "",
      });
    },

    async deleteUser(userId: string): Promise<void> {
      await redis.del(userKey(userId));
    },
  };
}

export type UserStore = ReturnType<typeof createUserStore>;