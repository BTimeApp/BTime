import type { IUser } from "@btime/types";

import { generateUUID } from "./uuid";

export function generateGuestUser(): IUser {
  const uuid = generateUUID();

  return {
    userInfo: {
      id: uuid,
      userName: `Guest-${uuid.slice(0, 8)}`,
      isGuest: true,
    },
    userPrivateInfo: { email: "", name: "Guest" },
  } as IUser;
}
