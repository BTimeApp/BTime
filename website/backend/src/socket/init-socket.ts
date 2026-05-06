import type { RedisStores } from "@/redis/stores.js";
import type { RoomWorker } from "@/rooms/room-worker.js";
import type { SocketClientEventArgs } from "@btime/types";
import type { IRoom, IRoomSettings, IUser, RoomRedisEvent } from "@btime/types";
import type { NextFunction } from "express";
import type http from "http";
import type { Server as HttpServer, ServerResponse } from "http";
import type { Redis } from "ioredis";
import type { LogFn } from "pino";
import type { Socket } from "socket.io";

import { createRoom } from "@/lib/room.js";
import { createSocketLogger, ServerLogger } from "@/logging/logger.js";
import { isPinoLogLevel } from "@btime/types";
import {
  SOCKET_CLIENT,
  SOCKET_CLIENT_CONFIG,
  SOCKET_SERVER,
} from "@btime/types";
import { createAdapter } from "@socket.io/redis-adapter";
import { randomUUID } from "crypto";
import passport from "passport";
import { Server } from "socket.io";

export type SocketMiddleware = (
  req: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  res: ServerResponse,
  next: NextFunction,
) => void;

export const createSocket = (
  httpServer: HttpServer,
  pubClient: Redis,
  subClient: Redis,
) => {
  return new Server(httpServer, {
    adapter: createAdapter(pubClient, subClient),
    cors: {
      credentials: true,
    },
    pingInterval: 5000,
    pingTimeout: 20000,
  });
};

export const setUpSocketMiddleware = (
  io: Server,
  sessionMiddleware: SocketMiddleware,
) => {
  function initialConnectionMiddleware(
    middleware: SocketMiddleware,
  ): SocketMiddleware {
    return (req, res, next) => {
      const isHandshake = req._query.sid === undefined;
      if (isHandshake) {
        middleware(req, res, next);
      } else {
        next();
      }
    };
  }

  io.engine.use(initialConnectionMiddleware(sessionMiddleware));
  io.engine.use(initialConnectionMiddleware(passport.session()));
};

export const startSocketListener = (
  io: Server,
  stores: RedisStores,
  roomWorker: RoomWorker,
) => {
  async function onConnect(socket: Socket) {
    // node environment hack?
    const req = socket.request as http.IncomingMessage & { user?: IUser };

    if (req.user) {
      // OAuth user — trust passport
      socket.data.user = req.user;
    } else {
      // Check handshake auth payload for guest
      const handshakeUser = socket.handshake.auth?.user as IUser | undefined;
      if (handshakeUser?.userInfo.isGuest) {
        socket.data.user = handshakeUser;
      } else {
        socket.disconnect(true);
        return;
      }
    }

    const SocketLogger = createSocketLogger(socket.id, socket.data.user);
    socket.data.logger = SocketLogger;

    socket.data.logger.info(
      `User ${socket.data.user?.userInfo.userName} (${socket.data.user?.userInfo.id}) connected via websocket.`,
    );

    const userId = socket.data.user!.userInfo.id;

    // user joins "their" room by default
    socket.join(userId);

    await stores.users.setUser(socket.data.user.userInfo);
    await stores.userSessions.addUserSession(userId, socket.id);
  }

  function createLoggingMiddleware(socket: Socket) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (packet: any[], next: (err?: Error) => void) => {
      const [eventName, ...args] = packet;

      const eventConfig =
        SOCKET_CLIENT_CONFIG[eventName as keyof typeof SOCKET_CLIENT_CONFIG];

      // Warn if event not registered
      if (!eventConfig) {
        socket.data.logger?.warn(
          { event: eventName },
          `Unknown socket client event: ${eventName}`,
        );
        return next();
      }

      // skip when logging level is none
      if (!isPinoLogLevel(eventConfig.logLevel)) {
        return next();
      }

      const logData = {
        event: eventName,
        /**
         * Room ID is dynamically changed within the socket's lifetime. Log it here.
         */
        roomId: socket.data.roomId,
        ...(eventConfig.logArgs && { args }),
      };

      if (socket.data.logger) {
        const logMethod = socket.data.logger?.[eventConfig.logLevel] as LogFn;
        logMethod.call(
          socket.data.logger,
          logData,
          `Received socket event: ${eventName}`,
        );
      }

      next();
    };
  }

  io.on("connection", async (socket: Socket) => {
    //since we require a user to log in, access and set first.
    await onConnect(socket);
    if (!socket.connected) {
      return;
    }
    const userId = socket.data.user!.userInfo.id;

    async function handleUserDisconnect(userId: string) {
      await stores.userSessions.deleteUserSession(userId, socket.id);

      stores.userSessions.numUserSessions(userId).then(async (numSessions) => {
        if (numSessions === 0) await stores.users.deleteUser(userId);
      });
    }

    socket.use(createLoggingMiddleware(socket));

    /**
     * Handle all room events
     */
    for (const clientEvent in SOCKET_CLIENT_CONFIG) {
      const key = clientEvent as keyof typeof SOCKET_CLIENT_CONFIG;
      const config = SOCKET_CLIENT_CONFIG[key];

      if (config.roomEventConfig.isRoomEvent === true) {
        socket.on(
          clientEvent,
          async (args: SocketClientEventArgs[typeof key]) => {
            const roomId =
              (args as { roomId?: string } | null)?.roomId ||
              socket.data.roomId;
            const userId = socket.data.user?.userInfo.id;

            // TODO - consider sending invalid argument events to the frontend?
            if (!roomId) {
              ServerLogger.warn({ clientEvent }, "Null roomId on socket");
              return;
            }
            if (!userId) {
              ServerLogger.warn({ clientEvent }, "Null userId on socket");
              return;
            }
            const enqueueResult = await stores.rooms.enqueueRoomEvent({
              roomId: roomId,
              userId: userId,
              socketId: socket.id,
              event: clientEvent,
              args: args,
            } as RoomRedisEvent);

            if (enqueueResult === 0) {
              //the room doesn't exist
              socket.emit(SOCKET_SERVER.INVALID_ROOM);
            }
          },
        );
      }
    }

    /**
     * CREATE_ROOM is a special event that doesn't get counted as a room event.
     * Since it's definitively the first event for any room, it shouldn't be processed with the room queue.
     */
    socket.on(
      SOCKET_CLIENT.CREATE_ROOM,
      async (
        { roomSettings }: { roomSettings: IRoomSettings },
        callback: (roomId: string) => void,
      ) => {
        let roomId: string = randomUUID();
        while ((await stores.rooms.getRoom(roomId)) != null) {
          roomId = randomUUID();
        }
        const room: IRoom = await createRoom(
          roomSettings,
          roomId,
          socket.data.user?.userInfo,
        );

        await stores.rooms.setRoom(room);
        roomWorker.startRoomProcessor(roomId);
        callback(roomId);
      },
    );

    /**
     * Upon socket disconnection - automatically trigger on client closing all webpages
     *
     * Since this is a special event, we don't want to move this to the event queue handler directly. It's worth manually queueing up LEAVE_ROOM here.
     */
    socket.on("disconnect", async () => {
      //handle potential room DC
      if (socket.data.roomId) {
        // manually enqueue LEAVE ROOM event!
        await stores.rooms.enqueueRoomEvent({
          roomId: socket.data.roomId,
          userId: userId,
          socketId: socket.id,
          event: "LEAVE_ROOM",
          args: { roomId: socket.data.roomId },
        } as RoomRedisEvent);
      }

      //handle user DC
      await handleUserDisconnect(userId);
    });
  });
};
