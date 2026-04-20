import type { IUser } from "@btime/types";

import { randomUUID } from "crypto";

export const GUEST_ID_PREFIX = "guest:";

export function isGuestId(id: string): boolean {
  return id.startsWith(GUEST_ID_PREFIX);
}

/**
 * Creates a transient guest IUser.
 */
export function createGuestUser(): IUser {
  const uuid = randomUUID();
  const shortId = uuid.slice(0, 8); // shortened version of ID. UUIDv4 should remove the chance of a time-based collision here.
  return {
    userInfo: {
      id: `${GUEST_ID_PREFIX}${uuid}`,
      userName: `Guest ${shortId}`,
      isGuest: true,
    },
    userPrivateInfo: {
      // Private fields are not meaningful for guests
      email: "",
      name: `Guest ${shortId}`,
    },
  };
}
