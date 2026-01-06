import { Server } from "socket.io";
import { SOCKET_CLIENT_CONFIG } from "@btime/types";
import { RedisStores } from "../../../../old/src/server/redis/stores";
import type { ExtractArgs } from "@btime/types";

type RoomEventHandlerFunction<TArgs> = (
  io: Server,
  stores: RedisStores,
  roomId: string,
  userId: string,
  socketId: string,
  args: TArgs
) => Promise<void>;

export type RoomEventHandlers = {
  [K in RoomEventKeys]: RoomEventHandlerFunction<
    ExtractArgs<(typeof SOCKET_CLIENT_CONFIG)[K]>
  >;
};

export type RoomEventKeys = {
  [K in keyof typeof SOCKET_CLIENT_CONFIG]: (typeof SOCKET_CLIENT_CONFIG)[K]["roomEventConfig"] extends {
    isRoomEvent: true;
  }
    ? K
    : never;
}[keyof typeof SOCKET_CLIENT_CONFIG];
