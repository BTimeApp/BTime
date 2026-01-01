import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { IRoom, RoomState, IRoomSettings, RoomRedisEvent } from "@/types/room";
import {
  newRoomSolve,
  resetRoom,
  finishRoomSolve,
  checkRoomSolveFinished,
  createRoom,
  updateRoom,
  checkRoomUpdateRequireReset,
  checkSetFinished,
  findSetWinners,
  checkMatchFinished,
  findMatchWinners,
  createTeam,
  userJoinTeam,
  userLeaveTeam,
  processNewResult,
  userJoinRoom,
  getLatestSolve,
  getLatestSet,
  newRoomSet,
} from "@/lib/room";
import { IUser, IUserInfo } from "@/types/user";
import { IRoomTeam, IRoomUser } from "@/types/room-participant";
import { IResult } from "@/types/result";
import { ServerResponse } from "http";
import { NextFunction } from "express";
import { ObjectId } from "bson";
import passport from "passport";
import bcrypt from "bcrypt";
import {
  SOCKET_CLIENT,
  SOCKET_CLIENT_CONFIG,
  SOCKET_SERVER,
  SocketCallback,
  SocketClientEventArgs,
  SocketResponse,
} from "@/types/socket_protocol";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { RedisStores } from "@/server/redis/stores";
import { IAttempt } from "@/types/solve";
import { LogFn, Logger } from "pino";
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

    async function getSocketRoom(): Promise<IRoom | null> {
      if (!socket.data.roomId) return null;
      return stores.rooms.getRoom(socket.data.roomId);
    }

    async function userIsHost(): Promise<boolean> {
      const room = await getSocketRoom();
      if (!room || !socket.data.user) return false;

      return (
        room.host != null && room.host.id === socket.data.user?.userInfo.id
      );
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
            const roomId = socket.data.roomId;
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
                    return;
                  }
                  break;
                }
                case "ROOMUSER_EXISTS": {
                  const room = await stores.rooms.getRoom(roomId);
                  if (!room) {
                    ServerLogger.warn({ clientEvent }, "Room does not exist");

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
                    ServerLogger.warn({ clientEvent }, "Room does not exist");

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

    socket.on(
      SOCKET_CLIENT.UPDATE_ROOM,
      async (
        roomSettings: IRoomSettings,
        roomId: string,
        userId: string,
        onSuccessCallback?: () => void
      ) => {
        const room = await stores.rooms.getRoom(roomId);
        if (!room || userId !== room.host?.id) {
          return;
        }

        // check if the room needs to be reset
        const needsReset = checkRoomUpdateRequireReset(room, roomSettings);

        // update room object
        await updateRoom(room, roomSettings);

        // reset room object if needed
        if (needsReset) {
          resetRoom(room);
        }

        // update room store
        await stores.rooms.setRoom(room);

        // broadcast room update
        io.to(roomId).emit(SOCKET_SERVER.ROOM_UPDATE, room);

        // upon successful update, call success callback
        onSuccessCallback?.();
      }
    );

    socket.on(
      SOCKET_CLIENT.JOIN_ROOM,
      async (
        {
          roomId,
          userId,
          password,
        }: {
          roomId: string;
          userId: string;
          password?: string;
        },
        joinRoomCallback: (
          roomValid: boolean,
          room?: IRoom,
          extraData?: Record<string, string>
        ) => void
      ) => {
        //validate real user
        const user: IUserInfo | null = await stores.users.getUser(userId);
        if (!user) {
          socket.data.logger?.debug(
            `Nonexistent user with id ${userId} attempting to join room ${roomId}.`
          );
          return;
        }

        //validate real room
        const room = await stores.rooms.getRoom(roomId);
        if (!room) {
          socket.data.logger?.debug(
            `User ${userId} trying to join nonexistent room ${roomId}`
          );
          joinRoomCallback(false, undefined, { INVALID_ROOM: "" });
          return;
        }

        //validate user isn't banned
        if (
          Object.keys(room.users).includes(userId) &&
          room.users[userId].banned
        ) {
          socket.data.logger?.debug(
            `Banned user ${userId} trying to join room ${roomId}.`
          );

          joinRoomCallback(true, undefined, {
            USER_BANNED: "",
          });
          return;
        }

        //validate user is not already (active) in this room
        if (
          Object.keys(room.users).includes(userId) &&
          room.users[userId].active
        ) {
          socket.data.logger?.debug(
            `User ${userId} double join in room ${roomId}.`
          );

          // precautionary persist - there is currently a race condition
          await stores.rooms.persistRoom(room.id);

          joinRoomCallback(true, room, {
            DUPLICATE_JOIN: "",
            EXISTING_USER_INFO: userId,
          });
          return;
        }

        //validate the room still has capacity
        if (
          room.settings.maxUsers &&
          Object.keys(room.users).length >= room.settings.maxUsers
        ) {
          socket.data.logger?.debug(
            `User ${userId} tried to join a full room ${roomId}.`
          );

          joinRoomCallback(true, undefined, {
            ROOM_FULL: "",
          });
          return;
        }

        //validate password if room is private AND user isn't host
        if (
          room.settings.access.visibility === "PRIVATE" &&
          userId !== room.host?.id &&
          password
        ) {
          //room password should never be undefined, but just in case, cast to empty string
          const correctPassword = await bcrypt.compare(
            password,
            room.settings.access.password
          );
          if (!correctPassword) {
            socket.data.logger?.info(
              `User ${userId} submitted the wrong password to room ${roomId}.`
            );
            joinRoomCallback(true, undefined, { WRONG_PASSWORD: "" });
            return;
          }
        }
        /**
         * User is successfully joining the room at this point.
         */

        // if this room is scheduled for deletion, don't delete it
        await stores.rooms.persistRoom(roomId);

        //add user to room
        socket.data.logger?.info(
          `User ${user.userName} joining room ${roomId}.`
        );

        const extraData: Record<string, string> = {};

        const newUser: boolean = userJoinRoom(room, user);
        if (!newUser) {
          extraData["EXISTING_USER_INFO"] = userId;
        }

        //write room to room store
        await stores.rooms.setRoom(room);

        // formally add this socket connection to the room and call the join callback.
        // this callback (for now) should have all of the room data the user needs, so they are excluded from the following broadcast event.
        socket.join(roomId);
        socket.data.roomId = roomId;
        joinRoomCallback(true, room, extraData);

        // broadcast update to all other users
        io.to(roomId)
          .except(userId)
          .emit(SOCKET_SERVER.USER_JOINED, room.users[userId]);
        // if room is started, need to update solves object
        const currentSolve = getLatestSolve(room);
        if (
          room.state === "STARTED" &&
          !room.settings.teamSettings.teamsEnabled &&
          currentSolve
        ) {
          io.to(roomId)
            .except(userId)
            .emit(SOCKET_SERVER.SOLVE_UPDATE, currentSolve);
        }
      }
    );

    /**
     * Upon user submitting a new result
     */
    socket.on(
      SOCKET_CLIENT.SUBMIT_RESULT,
      async (result: IResult, onSuccessCallback?: () => void) => {
        if (socket.data.roomId && socket.data.user) {
          const room = await stores.rooms.getRoom(socket.data.roomId);
          if (!room) return;

          if (room.state !== "STARTED") {
            socket.data.logger?.debug(
              `User ${socket.data.user?.userInfo.id} tried to submit a result to ${socket.data.roomId} in the wrong room state. Ignoring message.`
            );
            return;
          }
          const currentSolve = getLatestSolve(room);
          if (!currentSolve) {
            socket.data.logger?.debug(
              `User ${socket.data.user?.userInfo.id} tried to submit a result to ${socket.data.roomId} when there are no solves in the room.`
            );
            return;
          }

          const updatedTeam = processNewResult(
            room,
            socket.data.user.userInfo.id,
            result
          );

          io.to(socket.data.roomId).emit(
            SOCKET_SERVER.NEW_USER_RESULT,
            userId,
            result
          );

          if (updatedTeam !== undefined) {
            io.to(socket.data.roomId).emit(
              SOCKET_SERVER.TEAM_UPDATE,
              updatedTeam
            );
            // this is the wrong result!
            io.to(socket.data.roomId).emit(
              SOCKET_SERVER.NEW_RESULT,
              updatedTeam.team.id,
              currentSolve.solve.results[updatedTeam.team.id]
            );
          } else {
            io.to(socket.data.roomId).emit(
              SOCKET_SERVER.NEW_RESULT,
              userId,
              result
            );
          }

          onSuccessCallback?.();

          if (checkRoomSolveFinished(room)) {
            await handleSolveFinished(room);
          }
          await stores.rooms.setRoom(room);
        }
      }
    );

    /**
     * Upon host requesting a new team created
     */
    socket.on(
      SOCKET_CLIENT.CREATE_TEAMS,
      async (
        teamNames: string[],
        createTeamCallback: SocketCallback<undefined>
      ) => {
        const room = await getSocketRoom();
        if (!room) {
          createTeamCallback({ success: false, reason: "Room does not exist" });
          return;
        } else if (!(await userIsHost())) {
          createTeamCallback({
            success: false,
            reason: "User is not host user",
          });
          return;
        } else if (!room.settings.teamSettings.teamsEnabled) {
          createTeamCallback({
            success: false,
            reason: "Teams mode is not enabled in this room",
          });
          return;
        } else if (
          room.settings.teamSettings.maxNumTeams &&
          Object.keys(room.teams).length >=
            room.settings.teamSettings.maxNumTeams
        ) {
          createTeamCallback({
            success: false,
            reason: "Maximum amount of teams already created",
          });
          return;
        }

        const newTeams = [] as IRoomTeam[];

        for (const teamName of teamNames) {
          if (
            room.settings.teamSettings.maxNumTeams &&
            Object.keys(room.teams).length >=
              room.settings.teamSettings.maxNumTeams
          ) {
            break;
          }
          const newTeam = createTeam(room, teamName);
          room.teams[newTeam.team.id] = newTeam;
          newTeams.push(newTeam);
        }

        //persist to redis
        await stores.rooms.setRoom(room);

        //broadcast new team event
        io.to(room.id).emit(SOCKET_SERVER.TEAMS_CREATED, newTeams);

        createTeamCallback({ success: true, data: undefined });
      }
    );

    /**
     * Upon user trying to join team
     */
    socket.on(
      SOCKET_CLIENT.JOIN_TEAM,
      async (teamId: string, joinTeamCallback: SocketCallback<undefined>) => {
        const user = socket.data.user;
        const room = await getSocketRoom();
        if (!room || !user || !room.settings.teamSettings.teamsEnabled) return;

        const response: SocketResponse<{
          resetTeamResult: boolean;
          attempt: IAttempt | undefined;
        }> = await userJoinTeam(room, user.userInfo.id, teamId);

        if (response.success) {
          await stores.rooms.setRoom(room);

          io.to(room.id).emit(
            SOCKET_SERVER.USER_JOIN_TEAM,
            room.users[user.userInfo.id],
            room.teams[teamId],
            response.data
          );
        }

        joinTeamCallback({ ...response, data: undefined });
      }
    );

    /**
     * Upon socket disconnection - automatically trigger on client closing all webpages
     */
    socket.on("disconnect", async () => {
      //handle potential room DC
      if (socket.data.roomId) {
        await handleRoomDisconnect(userId, socket.data.roomId);
      }

      //handle user DC
      await handleUserDisconnect(userId);
    });
  });
};
