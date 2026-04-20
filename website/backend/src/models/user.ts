import type { User } from "@/database/schema.js";
import type { IUser } from "@btime/types";

/** Converts a Drizzle User to IUser for use in the backend.
 *
 */
export function toIUser(user: User): IUser {
  return {
    userInfo: {
      id: user.id.toString(),
      userName: user.userName,
      avatarURL: user.avatarURL || undefined,
      isGuest: false,
    },
    userPrivateInfo: {
      name: user.name,
      email: user.email,
      wcaId: user.wcaId || undefined,
    },
  };
}
