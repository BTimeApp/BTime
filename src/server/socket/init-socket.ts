import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { IRoom, RoomState, IRoomSettings } from "@/types/room";
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
  resetSolve,
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
import { SolveStatus } from "@/types/status";
import { ServerResponse } from "http";
import { NextFunction } from "express";
import { ObjectId } from "bson";
import passport from "passport";
import bcrypt from "bcrypt";
import {
  SOCKET_CLIENT,
  SOCKET_SERVER,
  SocketCallback,
  SocketResponse,
} from "@/types/socket_protocol";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { RedisStores } from "@/server/redis/stores";
import { IAttempt } from "@/types/solve";

//defines useful state variables we want to maintain over the lifestyle of a socket connection (only visible server-side)
interface CustomSocket extends Socket {
  roomId?: string;
  user?: IUser;
}

export type SocketMiddleware = (
  req: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  res: ServerResponse,
  next: NextFunction
) => void;

export const initSocket = (
  httpServer: HttpServer,
  sessionMiddleware: SocketMiddleware,
  pubClient: Redis,
  subClient: Redis,
  dataStores: RedisStores
) => {
  const io = new Server(httpServer, {
    adapter: createAdapter(pubClient, subClient),
    cors: {
      credentials: true,
    },
    pingInterval: 5000,
    pingTimeout: 20000,
  });

  // middleware should be taken care of in the main server script

  //https://socket.io/how-to/use-with-passport
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

  // TODO: move socket events to their own namespaces
  listenSocketEvents(io, dataStores);
};

const listenSocketEvents = (io: Server, stores: RedisStores) => {
  async function onConnect(socket: CustomSocket) {
    //check for user. DC if no user
    socket.user = socket.request.user;
    if (!socket.user) {
      socket.disconnect(true);
      return;
    }

    console.log(
      `User ${socket.user?.userInfo.userName} (${socket.user?.userInfo.id}) connected via websocket.`
    );

    const userId = socket.user!.userInfo.id;

    // user joins "their" room by default
    socket.join(userId);

    await stores.users.setUser(socket.user.userInfo);
    await stores.userSessions.addUserSession(userId, socket.id);
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
      io.to(room.id).emit(SOCKET_SERVER.TEAMS_UPDATE, room.teams);
      io.to(room.id).emit(SOCKET_SERVER.NEW_SOLVE, newSolve);
    }
  }

  function socketIntersection(roomA: string, roomB: string) {
    /**
     * As of v4, socket.io does not support intersection logic, only union logic.
     * We implement the intersection with set intersect, which is O(min(|A|, |B|))
     */
    const setA = io.sockets.adapter.rooms.get(roomA);
    const setB = io.sockets.adapter.rooms.get(roomB);

    // Handle edge cases
    if (!setA || !setB) return [];

    // Always iterate over the smaller set for efficiency
    const [smaller, larger] =
      setA.size <= setB.size ? [setA, setB] : [setB, setA];

    // Find intersection by filtering the smaller set
    return [...smaller].filter((socketId) => larger.has(socketId));
  }

  io.on("connection", async (socket: CustomSocket) => {
    //since we require a user to log in, access and set first.
    await onConnect(socket);
    if (!socket.connected) {
      return;
    }
    const userId = socket.user!.userInfo.id;

    async function handleUserLeaveTeam(
      room: IRoom,
      userId: string,
      teamId: string
    ) {
      const response = await userLeaveTeam(room, userId, teamId);
      await stores.rooms.setRoom(room);

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
    }

    async function handleUserDisconnect(userId: string) {
      await stores.userSessions.deleteUserSession(userId, socket.id);

      stores.userSessions.numUserSessions(userId).then(async (numSessions) => {
        if (numSessions === 0) await stores.users.deleteUser(userId);
      });
    }

    async function handleRoomDisconnect(userId: string, roomId: string) {
      if (!userId || !roomId) return;
      console.log(`User ${userId} disconnected from room ${roomId}`);
      const room = await stores.rooms.getRoom(roomId);
      if (!room) return;

      if (room.users[userId]) {
        // mark user as inactive
        room.users[userId].active = false;

        //TODO - this might not be safe in the future if a timer is supposed to default to something other than IDLE and we persist timertype
        //unless the user already submitted a time, reset their solve status too
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
        console.log(
          `Warning: user ${userId} does not exist in room ${roomId}'s users but is trying to leave room.`
        );
      }

      //check if no more users, if so, schedule room deletion.
      if (
        Object.values(room.users).filter((roomUser) => roomUser.active)
          .length == 0
      ) {
        console.log(`Room ${roomId} is empty. Scheduling room for deletion.`);
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
          console.log(
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
      socket.roomId = undefined;
    }

    async function getSocketRoom(): Promise<IRoom | null> {
      if (!socket.roomId) return null;
      return stores.rooms.getRoom(socket.roomId);
    }

    async function userIsHost(): Promise<boolean> {
      const room = await getSocketRoom();
      if (!room || !socket.user) return false;

      return room.host != null && room.host.id === socket.user?.userInfo.id;
    }

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
          socket.user?.userInfo
        );

        await stores.rooms.setRoom(room);
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
          console.log(
            `Nonexistent user with id ${userId} attempting to join room ${roomId}.`
          );
          return;
        }

        //validate real room
        const room = await stores.rooms.getRoom(roomId);
        if (!room) {
          console.log(
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
          console.log(`Banned user ${userId} trying to join room ${roomId}.`);

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
          console.log(`User ${userId} double join in room ${roomId}.`);

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
          console.log(`User ${userId} tried to join a full room ${roomId}.`);

          joinRoomCallback(true, room, {
            ROOM_FULL: "",
          });
          return;
        }

        //validate password if room is private AND user isn't host
        if (
          room.settings.access.visibility === "PRIVATE" &&
          userId !== room.host?.id
        ) {
          if (!password) {
            //this should only occur upon the first join_room ping - safe to return early
            joinRoomCallback(true, undefined, {});
            return;
          }

          //room password should never be undefined, but just in case, cast to empty string
          const correctPassword = await bcrypt.compare(
            password,
            room.settings.access.password
          );
          if (!correctPassword) {
            console.log(
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
        console.log(`User ${user.userName} joining room ${roomId}.`);

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
        socket.roomId = roomId;
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
     * Upon host pressing skip scramble button
     */
    socket.on(SOCKET_CLIENT.NEW_SCRAMBLE, async () => {
      console.log(
        `User ${socket.user?.userInfo.id} new scramble in room ${socket.roomId}.`
      );
      const room = await getSocketRoom();
      if (!room) return;

      const currentSolve = getLatestSolve(room);
      if (room.state != "STARTED") {
        console.log(`Cannot skip scramble when room state is ${room.state}`);
      } else if (!currentSolve) {
        console.log(`Cannot skip scramble when there is no current solve.`);
      } else {
        await resetSolve(room);
        await stores.rooms.setRoom(room);
        io.to(room.id).emit(SOCKET_SERVER.SOLVE_RESET, currentSolve);
      }
    });

    socket.on(SOCKET_CLIENT.FORCE_NEXT_SOLVE, async () => {
      console.log(
        `User ${socket.user?.userInfo.id} is trying to skip the current solve in room ${socket.roomId}.`
      );
      const room = await getSocketRoom();
      if (!room) return;

      if (room.state == "STARTED") {
        await handleSolveFinished(room);
        await stores.rooms.setRoom(room);
      } else {
        console.log(`Cannot skip scramble when room state is ${room.state}`);
      }
    });

    socket.on(SOCKET_CLIENT.BAN_USER, async (userId: string) => {
      const room = await getSocketRoom();
      if (!room || !(await userIsHost())) return;

      const banUser = room?.users[userId];
      if (!banUser) return;
      banUser.banned = true;

      console.log(
        `User ${socket.user?.userInfo.userName} banned user ${banUser.user.userName} from room ${socket.roomId}.`
      );

      await stores.rooms.setRoom(room);
      //broadcast user update to the rest of the room
      io.to(room.id).emit(SOCKET_SERVER.USER_BANNED, userId);
    });

    socket.on(SOCKET_CLIENT.UNBAN_USER, async (userId: string) => {
      const room = await getSocketRoom();
      if (!room || !(await userIsHost())) return;

      const unbanUser = room?.users[userId];
      if (!unbanUser) return;
      unbanUser.banned = false;

      console.log(
        `User ${socket.user?.userInfo.userName} unbanned user ${unbanUser.user.userName} from room ${socket.roomId}.`
      );

      await stores.rooms.setRoom(room);
      //broadcast user update to the rest of the room
      io.to(room.id).emit(SOCKET_SERVER.USER_UNBANNED, userId);
    });

    socket.on(SOCKET_CLIENT.KICK_USER, async (userId: string) => {
      const room = await getSocketRoom();
      if (!room || !(await userIsHost())) return;

      const kickUser = room?.users[userId];
      if (!kickUser) return;

      const kickUserSockets = socketIntersection(userId, room.id);

      // Emit to each socket in the intersection
      kickUserSockets.forEach((kickUserSocketId: string) => {
        io.to(kickUserSocketId).emit(SOCKET_SERVER.USER_KICKED);
      });

      console.log(
        `User ${socket.user?.userInfo.userName} kicked user ${kickUser.user.userName} from room ${socket.roomId}.`
      );

      //we do not have to send anything to others - the kicked user will room DC, and that will broadcast to all users immediatley.
    });

    /**
     * Upon host starting the room
     */
    socket.on(SOCKET_CLIENT.START_ROOM, async () => {
      console.log(
        `User ${socket.user?.userInfo.id} is trying to start room ${socket.roomId}.`
      );
      const room = await getSocketRoom();
      if (!room) return;

      if (room.state == "WAITING" || room.state == "FINISHED") {
        room.state = "STARTED";
        const newSet = await newRoomSet(room);
        const newSolve = await newRoomSolve(room);

        await stores.rooms.setRoom(room);
        io.to(room.id).emit(SOCKET_SERVER.ROOM_STARTED);
        io.to(room.id).emit(SOCKET_SERVER.TEAMS_UPDATE, room.teams);
        //manually remove the solve since we're sending it over the wire right after this - avoids duplicating
        io.to(room.id).emit(SOCKET_SERVER.NEW_SET, { ...newSet, solves: [] });
        io.to(room.id).emit(SOCKET_SERVER.NEW_SOLVE, newSolve);
      } else {
        console.log(`Cannot start room when room state is ${room.state}`);
      }
    });

    /**
     * Upon host pressing reset button
     */
    socket.on(SOCKET_CLIENT.RESET_ROOM, async () => {
      console.log(
        `User ${socket.user?.userInfo.id} is trying to reset room ${socket.roomId}.`
      );
      const room = await getSocketRoom();
      if (!room) return;

      if (room.state == "STARTED" || room.state == "FINISHED") {
        resetRoom(room);

        await stores.rooms.setRoom(room);
        io.to(room.id).emit(SOCKET_SERVER.ROOM_RESET);
      } else {
        console.log(`Cannot reset room when room state is ${room.state}`);
      }
    });

    /**
     * Upon host pressing rematch button
     */
    socket.on(SOCKET_CLIENT.REMATCH_ROOM, async () => {
      console.log(
        `User ${socket.user?.userInfo.id} is trying to rematch room ${socket.roomId}.`
      );
      const room = await getSocketRoom();
      if (!room) return;

      if (room.state == "FINISHED") {
        resetRoom(room);

        await stores.rooms.setRoom(room);
        io.to(room.id).emit(SOCKET_SERVER.ROOM_RESET);
      } else {
        console.log(`Cannot rematch room when room state is ${room.state}`);
      }
    });

    /**
     * Upon user updating their status
     */
    socket.on(
      SOCKET_CLIENT.UPDATE_SOLVE_STATUS,
      async (newUserStatus: SolveStatus) => {
        if (socket.roomId && socket.user) {
          const room = await stores.rooms.getRoom(socket.roomId);
          if (!room) return;

          const currentUserStatus: SolveStatus =
            room.users[socket.user?.userInfo.id].solveStatus;
          if (newUserStatus == currentUserStatus) {
            console.log(
              `User ${socket.user?.userInfo.id} submitted new user status ${newUserStatus} to room ${socket.roomId} which is the same as old user status.`
            );
          } else {
            console.log(
              `User ${socket.user?.userInfo.userName} submitted new user status ${newUserStatus} to room ${socket.roomId}`
            );
            room.users[socket.user?.userInfo.id].solveStatus = newUserStatus;

            io.to(socket.roomId).emit(
              SOCKET_SERVER.USER_STATUS_UPDATE,
              userId,
              newUserStatus
            );

            if (newUserStatus === "FINISHED") {
              const solveFinished: boolean = checkRoomSolveFinished(room);
              if (solveFinished) {
                await handleSolveFinished(room);
              }
            }

            await stores.rooms.setRoom(room);
          }
        }
      }
    );

    /**
     * Upon user starting any live timer option (only keyboard as of now)
     */
    socket.on(SOCKET_CLIENT.START_LIVE_TIMER, async () => {
      if (socket.roomId && socket.user) {
        const room = await stores.rooms.getRoom(socket.roomId);
        if (!room) return;

        io.to(socket.roomId)
          .except(userId)
          .emit(SOCKET_SERVER.USER_START_LIVE_TIMER, userId);
      }
    });

    /**
     * Upon user stopping any live timer option (only keyboard as of now)
     */
    socket.on(SOCKET_CLIENT.STOP_LIVE_TIMER, async () => {
      if (socket.roomId && socket.user) {
        const room = await stores.rooms.getRoom(socket.roomId);
        if (!room) return;

        io.to(socket.roomId)
          .except(userId)
          .emit(SOCKET_SERVER.USER_STOP_LIVE_TIMER, userId);
      }
    });

    /**
     * Upon user submitting a new result
     */
    socket.on(
      SOCKET_CLIENT.SUBMIT_RESULT,
      async (result: IResult, onSuccessCallback?: () => void) => {
        // we store results as an easily-serializable type and reconstruct on client when needed.
        // Socket.io does not preserve complex object types over the network, so it makes it hard to pass Result types around anyways.
        if (socket.roomId && socket.user) {
          const room = await stores.rooms.getRoom(socket.roomId);
          if (!room) return;

          if (room.state !== "STARTED") {
            console.log(
              `User ${socket.user?.userInfo.id} tried to submit a result to ${socket.roomId} in the wrong room state. Ignoring message.`
            );
            return;
          }
          if (!getLatestSolve(room)) {
            console.log(
              `User ${socket.user?.userInfo.id} tried to submit a result to ${socket.roomId} when there are no solves in the room.`
            );
            return;
          }

          console.log(
            `User ${socket.user?.userInfo.userName} submitted new result ${result} to room ${socket.roomId}`
          );

          const updatedTeam = processNewResult(
            room,
            socket.user.userInfo.id,
            result
          );

          await stores.rooms.setRoom(room);
          //broadcast user submit event to other users

          if (updatedTeam !== undefined) {
            io.to(socket.roomId).emit(SOCKET_SERVER.TEAM_UPDATE, updatedTeam);
            io.to(socket.roomId).emit(
              SOCKET_SERVER.NEW_RESULT,
              updatedTeam.team.id,
              result
            );
          } else {
            io.to(socket.roomId).emit(SOCKET_SERVER.NEW_RESULT, userId, result);
          }
          onSuccessCallback?.();
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

        console.log(
          `New team(s) created in room ${socket.roomId}: ${teamNames}`
        );

        //broadcast new team event
        io.to(room.id).emit(SOCKET_SERVER.TEAMS_CREATED, newTeams);

        createTeamCallback({ success: true, data: undefined });
      }
    );

    /**
     * Upon host requesting a team deleted
     */
    socket.on(SOCKET_CLIENT.DELETE_TEAM, async (teamId: string) => {
      const room = await getSocketRoom();
      if (
        !room ||
        !(await userIsHost()) ||
        !room.settings.teamSettings.teamsEnabled
      )
        return;

      console.log(`Team ${teamId} deleted in room ${socket.roomId}`);

      delete room.teams[teamId];
      await stores.rooms.setRoom(room);

      io.to(room.id).emit(SOCKET_SERVER.TEAM_DELETED, teamId);
    });

    /**
     * Upon user trying to join team
     */
    socket.on(
      SOCKET_CLIENT.JOIN_TEAM,
      async (teamId: string, joinTeamCallback: SocketCallback<undefined>) => {
        const user = socket.user;
        const room = await getSocketRoom();
        if (!room || !user || !room.settings.teamSettings.teamsEnabled) return;

        const response: SocketResponse<undefined | IAttempt> =
          await userJoinTeam(room, user.userInfo.id, teamId);

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
     * Upon user trying to leave team
     */
    socket.on(SOCKET_CLIENT.LEAVE_TEAM, async (teamId: string) => {
      const user = socket.user;
      const room = await getSocketRoom();
      if (
        !room ||
        !user ||
        !room.settings.teamSettings.teamsEnabled ||
        !room.teams[teamId]
      )
        return;

      await handleUserLeaveTeam(room, user.userInfo.id, teamId);
    });
    /**
     * Upon user pressing compete/spectate button
     */
    socket.on(SOCKET_CLIENT.TOGGLE_COMPETING, async (competing: boolean) => {
      if (socket.roomId && socket.user) {
        const room = await stores.rooms.getRoom(socket.roomId);
        if (
          !room ||
          room.users[socket.user?.userInfo.id].competing == competing
        ) {
          console.log(
            `User ${
              socket.user?.userInfo.id
            } tried to toggle competing status to the same as it currently is: ${
              competing ? "competing" : "spectating"
            } in room ${socket.roomId}`
          );
          return;
        }

        if (room.settings.teamSettings.teamsEnabled) {
          // users should never try to toggle their competing mode when in teams mode
          console.log(
            `User ${socket.user?.userInfo.id} tried to toggle competing status while teams is enabled in room ${socket.roomId}`
          );
          return;
        }

        console.log(
          `User ${socket.user?.userInfo.id} is now ${
            competing ? "competing" : "spectating"
          } in room ${socket.roomId}`
        );
        room.users[socket.user?.userInfo.id].competing = competing;

        // when user spectates, need to check if all competing users are done, then advance room
        if (room.state === "STARTED") {
          const solveFinished: boolean = checkRoomSolveFinished(room);
          if (solveFinished) {
            handleSolveFinished(room);
          }
        }
        await stores.rooms.setRoom(room);
        io.to(socket.roomId).emit(
          SOCKET_SERVER.USER_TOGGLE_COMPETING,
          userId,
          competing
        );
      } else {
        console.log(
          `Either roomId or userId not set on socket: ${socket.roomId}, ${socket.user?.userInfo.id}`
        );
      }
    });

    /**
     * User has left the room. Handle
     */
    socket.on(SOCKET_CLIENT.LEAVE_ROOM, async (roomId: string) => {
      console.log(
        `User ${socket.user?.userInfo.userName} (${userId}) left room ${roomId} `
      );
      await handleRoomDisconnect(userId, roomId);
    });

    /**
     * Upon socket disconnection - automatically trigger on client closing all webpages
     */
    socket.on("disconnect", async (reason) => {
      console.log(
        `User ${socket.user?.userInfo.userName} (${userId}) disconnect from socket with reason: ${reason}`
      );
      //handle potential room DC
      if (socket.roomId) {
        await handleRoomDisconnect(userId, socket.roomId);
      }

      //handle user DC
      await handleUserDisconnect(userId);
    });
  });
};
