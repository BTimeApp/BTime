import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { IRoom, RoomState, IRoomSettings, RoomRedisEvent } from "@/types/room";
import {
  newRoomSolve,
  finishRoomSolve,
  checkRoomSolveFinished,
  createRoom,
  checkSetFinished,
  findSetWinners,
  checkMatchFinished,
  findMatchWinners,
  userLeaveTeam,
  getLatestSolve,
  getLatestSet,
  newRoomSet,
} from "@/lib/room";
import { IRoomUser } from "@/types/room-participant";
import { ServerResponse } from "http";
import { NextFunction } from "express";
import { ObjectId } from "bson";
import passport from "passport";
import {
  SOCKET_CLIENT,
  SOCKET_CLIENT_CONFIG,
  SOCKET_SERVER,
  SocketClientEventArgs,
} from "@/types/socket_protocol";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { RedisStores } from "@/server/redis/stores";
import { LogFn } from "pino";
import { createSocketLogger, ServerLogger } from "@/server/logging/logger";
import { isPinoLogLevel } from "@/types/log-levels";
import { RoomWorker } from "@/server/rooms/room-worker";

export type SocketMiddleware = (
  req: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  res: ServerResponse,
  next: NextFunction
) => void;

export const createSocket = (
  httpServer: HttpServer,
  pubClient: Redis,
  subClient: Redis
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
  sessionMiddleware: SocketMiddleware
) => {
  function socketHandshakeMiddleware(
    middleware: SocketMiddleware
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

  io.engine.use(socketHandshakeMiddleware(sessionMiddleware));
  io.engine.use(socketHandshakeMiddleware(passport.session()));
  io.engine.use(
    socketHandshakeMiddleware((req, res, next) => {
      if (req.user) {
        next();
      } else {
        res.writeHead(401);
        res.end();
      }
    })
  );
};

export const startSocketListener = (
  io: Server,
  stores: RedisStores,
  roomWorker: RoomWorker
) => {
  async function onConnect(socket: Socket) {
    //check for user. DC if no user
    socket.data.user = socket.request.user;
    if (!socket.data.user) {
      socket.disconnect(true);
      return;
    }

    const SocketLogger = createSocketLogger(socket.id, socket.data.user);
    socket.data.logger = SocketLogger;

    socket.data.logger.info(
      `User ${socket.data.user?.userInfo.userName} (${socket.data.user?.userInfo.id}) connected via websocket.`
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
          `Unknown socket client event: ${eventName}`
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
          `Received socket event: ${eventName}`
        );
      }

      next();
    };
  }

  //TODO: abstract this function away to room lib
  async function handleSolveFinished(room: IRoom) {
    finishRoomSolve(room);
    const currentSolve = getLatestSolve(room);
    const currentSet = getLatestSet(room);
    if (!currentSolve || !currentSet) return;
    const participants = room.settings.teamSettings.teamsEnabled
      ? room.teams
      : room.users;

    // only check set and match wins if not a casual room
    if (room.settings.raceSettings.roomFormat !== "CASUAL") {
      //check set finished.
      const setFinished = checkSetFinished(room);
      if (setFinished) {
        // find set winners.
        const setWinners: string[] = findSetWinners(room);
        currentSet.winners = setWinners;
        currentSet.finished = true;

        // update set wins for set winners
        setWinners.map((pid) => (participants[pid].setWins += 1));

        // reset all users' points
        Object.values(participants).map((participant) => {
          participant.points = 0;
        });

        // check match finished. right now a match can only be finished if the set is finished.
        const matchFinished = checkMatchFinished(room);
        if (matchFinished) {
          const matchWinners: string[] = findMatchWinners(room);
          //handle match finished
          room.match.winners = matchWinners;
          room.match.finished = true;
          room.state = "FINISHED";

          //publish solve finished after updating match winners, but before sending match finished
          io.to(room.id).emit(
            SOCKET_SERVER.SOLVE_FINISHED_EVENT,
            currentSolve,
            participants
          );

          //publish set finished event with winners
          io.to(room.id).emit(SOCKET_SERVER.SET_FINISHED_EVENT, setWinners);

          //publish match finished event with winners
          io.to(room.id).emit(SOCKET_SERVER.MATCH_FINISHED_EVENT, matchWinners);
        } else {
          //publish solve finished after updating set winners, but before creating a new set
          io.to(room.id).emit(
            SOCKET_SERVER.SOLVE_FINISHED_EVENT,
            currentSolve,
            participants
          );

          //publish set finished event with winners
          io.to(room.id).emit(SOCKET_SERVER.SET_FINISHED_EVENT, setWinners);

          const newSet = newRoomSet(room);
          io.to(room.id).emit(SOCKET_SERVER.NEW_SET, newSet);
        }
      } else {
        io.to(room.id).emit(
          SOCKET_SERVER.SOLVE_FINISHED_EVENT,
          currentSolve,
          participants
        );
      }
    } else {
      //publish solve finished event (casual case)
      io.to(room.id).emit(
        SOCKET_SERVER.SOLVE_FINISHED_EVENT,
        currentSolve,
        participants
      );
    }

    if ((room.state as RoomState) !== "FINISHED") {
      const newSolve = await newRoomSolve(room);
      if (room.settings.teamSettings.teamsEnabled) {
        io.to(room.id).emit(SOCKET_SERVER.TEAMS_UPDATE, room.teams);
      }
      io.to(room.id).emit(SOCKET_SERVER.NEW_SOLVE, newSolve);
    }
  }

  io.on("connection", async (socket: Socket) => {
    //since we require a user to log in, access and set first.
    await onConnect(socket);
    if (!socket.connected) {
      return;
    }
    const userId = socket.data.user!.userInfo.id;

    async function handleUserLeaveTeam(
      room: IRoom,
      userId: string,
      teamId: string
    ) {
      const response = await userLeaveTeam(room, userId, teamId);

      if (response.success) {
        // leave team will both remove user from team AND
        // remove user attempt + team result (when it exists). This needs to go first.
        io.to(room.id).emit(
          SOCKET_SERVER.USER_LEAVE_TEAM,
          room.users[userId],
          room.teams[teamId]
        );

        // tell the user that left to reset their local solve. Doesn't matter if they actually had a solve to begin with.
        io.to(userId).emit(SOCKET_SERVER.RESET_LOCAL_SOLVE);

        if (response.data) {
          if (response.data.newAttempt) {
            io.to(room.id).emit(
              SOCKET_SERVER.CREATE_ATTEMPT,
              response.data.newAttempt.userId,
              response.data.newAttempt.attempt
            );
          }

          if (response.data.refreshedTeamResult) {
            io.to(room.id).emit(
              SOCKET_SERVER.NEW_RESULT,
              response.data.refreshedTeamResult.teamId,
              response.data.refreshedTeamResult.result
            );
          }
        }

        if (checkRoomSolveFinished(room)) {
          await handleSolveFinished(room);
        }
      }
      await stores.rooms.setRoom(room);
    }

    async function handleUserDisconnect(userId: string) {
      await stores.userSessions.deleteUserSession(userId, socket.id);

      stores.userSessions.numUserSessions(userId).then(async (numSessions) => {
        if (numSessions === 0) await stores.users.deleteUser(userId);
      });
    }

    async function handleRoomDisconnect(userId: string, roomId: string) {
      if (!userId || !roomId) return;
      socket.data.logger?.info(
        `User ${userId} disconnected from room ${roomId}`
      );
      const room = await stores.rooms.getRoom(roomId);
      if (!room || !room.users[userId]) return;

      if (room.users[userId]) {
        // mark user as inactive
        room.users[userId].active = false;

        // canonically, the default solve status should be IDLE. If the user reconnects later, it is the responsibility of the client to make their solve status correct.
        if (room.users[userId].solveStatus !== "FINISHED") {
          room.users[userId].solveStatus = "IDLE";
        }
        // if teams is enabled and this user is on a team, force leave team
        const teamId = room.users[userId].currentTeam;
        if (room.settings.teamSettings.teamsEnabled && teamId !== undefined) {
          await handleUserLeaveTeam(room, userId, teamId);
        }

        io.to(roomId).emit(SOCKET_SERVER.USER_UPDATE, room.users[userId]);
      } else {
        socket.data.logger?.warn(
          `User ${userId} does not exist in room ${roomId}'s users but is trying to leave room.`
        );
      }

      //check if no more users, if so, schedule room deletion.
      if (
        Object.values(room.users).filter((roomUser) => roomUser.active)
          .length == 0
      ) {
        stores.rooms.scheduleRoomForDeletion(roomId);
        return;
      }

      //check if user is host OR there is somehow no host.
      if ((room.host && room.host.id == userId) || !room.host) {
        room.host = undefined;

        let earliestUser: IRoomUser | null = null;

        const hostEligibleUsers = Object.values(room.users).filter(
          (roomUser) => roomUser.active
        );

        for (const roomUser of hostEligibleUsers) {
          if (!earliestUser || roomUser.joinedAt < earliestUser.joinedAt) {
            earliestUser = roomUser;
          }
        }
        if (earliestUser) {
          room.host = earliestUser.user;
          socket.data.logger?.debug(
            `Room ${roomId} promoted a new host: ${room.host.userName}`
          );
          io.to(roomId).emit(SOCKET_SERVER.NEW_HOST, earliestUser.user.id);
        }
      }

      // handle case that this user was the last one to submit a time/compete
      if (checkRoomSolveFinished(room)) {
        await handleSolveFinished(room);
      }

      // write room to room store
      await stores.rooms.setRoom(room);

      // remove the room from this socket.
      socket.leave(roomId);
      socket.data.roomId = undefined;
    }

    socket.use(createLoggingMiddleware(socket));

    /**
     * Handle all room events
     */
    for (const clientEvent in SOCKET_CLIENT_CONFIG) {
      const key = clientEvent as keyof typeof SOCKET_CLIENT_CONFIG;
      const config = SOCKET_CLIENT_CONFIG[key];

      if (config.roomEventConfig.isRoomEvent === true) {
        const roomEventConfig = config.roomEventConfig as Extract<
          typeof config.roomEventConfig,
          { isRoomEvent: true }
        >;
        socket.on(
          clientEvent,
          async (args: SocketClientEventArgs[typeof key]) => {
            const roomId =
              socket.data.roomId ||
              (args as { roomId?: string } | null)?.roomId;
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

            for (const validation of roomEventConfig.validations) {
              switch (validation) {
                case "ROOM_EXISTS": {
                  const room = await stores.rooms.getRoom(roomId);
                  if (!room) {
                    ServerLogger.warn({ clientEvent }, "Room does not exist");
                    socket.emit(SOCKET_SERVER.INVALID_ROOM);
                    return;
                  }
                  break;
                }
                case "ROOMUSER_EXISTS": {
                  const room = await stores.rooms.getRoom(roomId);
                  if (!room) {
                    ServerLogger.warn(
                      { clientEvent },
                      "Roomuser does not exist"
                    );

                    return;
                  }
                  if (!room.users[userId]) {
                    ServerLogger.warn(
                      { clientEvent },
                      "Room user does not exist"
                    );

                    return;
                  }
                  break;
                }
                case "USER_IS_HOST": {
                  const room = await stores.rooms.getRoom(roomId);
                  if (!room) {
                    ServerLogger.warn({ clientEvent }, "User is not host");

                    return;
                  }
                  if (room.host != null && room.host.id !== userId) {
                    ServerLogger.warn({ clientEvent }, "Room user is not host");

                    return;
                  }

                  break;
                }
                default:
                  ServerLogger.error(
                    {
                      validation,
                    },
                    "Invalid room event validation detected. Fix this in dev."
                  );
                  break;
              }
            }
            await stores.rooms.enqueueRoomEvent({
              roomId: roomId,
              userId: userId,
              socketId: socket.id,
              event: clientEvent,
              args: args,
            } as RoomRedisEvent);
          }
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
        callback: (roomId: string) => void
      ) => {
        let roomId: string = new ObjectId().toString();
        while ((await stores.rooms.getRoom(roomId)) != null) {
          roomId = new ObjectId().toString();
        }
        const room: IRoom = await createRoom(
          roomSettings,
          roomId,
          socket.data.user?.userInfo
        );

        await stores.rooms.setRoom(room);
        roomWorker.startRoomProcessor(roomId);
        callback(roomId);
      }
    );

    /**
     * Upon socket disconnection - automatically trigger on client closing all webpages
     */
    socket.on("disconnect", async () => {
      ServerLogger.info({ socketData: socket.data }, "Socket disconnect event");
      //handle potential room DC
      if (socket.data.roomId) {
        await handleRoomDisconnect(userId, socket.data.roomId);
      }

      //handle user DC
      await handleUserDisconnect(userId);
    });
  });
};
