import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { Types } from "mongoose";
import {
  rooms,
  users,
  roomTimeouts,
  userSessions,
} from "@/server/server-objects";
import { IRoom, RoomState, IRoomSettings } from "@/types/room";
import {
  skipScramble,
  newRoomSolve,
  resetRoom,
  finishRoomSolve,
  checkRoomSolveFinished,
  createRoom,
  updateRoom,
  checkRoomUpdateRequireReset,
} from "@/lib/room";
import { IUser, IUserInfo, iUserToIUserInfo } from "@/types/user";
import { IRoomUser } from "@/types/room-user";
import { IResult } from "@/types/result";
import { SolveStatus } from "@/types/status";
import { IRoomSolve } from "@/types/room-solve";
import { ServerResponse } from "http";
import { NextFunction } from "express";
import { ObjectId } from "bson";
import passport from "passport";
import bcrypt from "bcrypt";
import { SOCKET_CLIENT, SOCKET_SERVER } from "@/types/socket_protocol";

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
  sessionMiddleware: SocketMiddleware
) => {
  const io = new Server(httpServer, {
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
  listenSocketEvents(io);
};

const listenSocketEvents = (io: Server) => {
  function onConnect(socket: CustomSocket) {
    //check for user. DC if no user
    socket.user = socket.request.user;
    if (!socket.user) {
      socket.disconnect(true);
      return;
    }

    console.log(
      `User ${socket.user?.userName} (${socket.user?.id}) connected via websocket.`
    );

    const userId = socket.user!.id;

    // user joins "their" room by default
    socket.join(userId);

    //add user to user store if not already
    if (!users.has(userId)) users.set(userId, iUserToIUserInfo(socket.user));
    if (!userSessions.has(userId)) userSessions.set(userId, new Set<string>());
    userSessions.get(userId)!.add(socket.id);
  }

  async function handleSolveFinished(room: IRoom) {
    finishRoomSolve(room);
    io.to(room.id).emit(SOCKET_SERVER.SOLVE_FINISHED_EVENT);
    if ((room.state as RoomState) !== "FINISHED") {
      await newRoomSolve(room);
    }
  }

  io.on("connection", (socket: CustomSocket) => {
    //since we require a user to log in, access and set first.
    onConnect(socket);
    if (!socket.connected) {
      return;
    }
    const userId = socket.user!.id;

    function handleUserDisconnect(userId: string) {
      userSessions.get(userId)?.delete(socket.id);

      if (!userSessions.has(userId) || userSessions.get(userId)?.size === 0) {
        users.delete(userId);
      }
    }

    function handleRoomDisconnect(userId: string, roomId: string) {
      if (!userId || !roomId) return;
      console.log(`User ${userId} disconnected from room ${roomId}`);
      const room = rooms.get(roomId);
      if (!room) return;

      // mark user as inactive
      room.users[userId].active = false;

      //TODO - this might not be safe in the future if a timer is supposed to default to something other than IDLE and we persist timertype
      //unless the user already submitted a time, reset their solve status too
      if (room.users[userId].userStatus !== "FINISHED") {
        room.users[userId].userStatus = "IDLE";
      }

      io.to(roomId.toString()).emit(SOCKET_SERVER.ROOM_UPDATE, room);

      //check if no more users, if so, schedule room deletion.
      if (
        Object.values(room.users).filter((roomUser) => roomUser.active)
          .length == 0
      ) {
        console.log(`Room ${roomId} is empty. Scheduling room for deletion.`);
        roomTimeouts.set(
          roomId,
          setTimeout(() => {
            rooms.delete(roomId);
            roomTimeouts.delete(roomId);
          }, 5000)
        );
        return;
      }

      //check if user is host OR there is somehow no host.
      if ((room.host && room.host.id == userId) || !room.host) {
        if (room.host) {
          console.log(`Host has left room ${roomId}. Promoting a new host.`);
        } else {
          console.log(
            `User left room without a host: ${roomId}. Promoting a new host.`
          );
        }

        let earliestID = null;
        let earliestUser: IRoomUser | null = null;

        for (const userID in room.users) {
          const user = room.users[userID];

          if (!earliestUser || user.joinedAt < earliestUser.joinedAt) {
            earliestUser = user;
            earliestID = new Types.ObjectId(userID);
          }
        }

        room.host = room.users[earliestID!.toString()].user;
        io.to(roomId.toString()).emit(SOCKET_SERVER.ROOM_UPDATE, room);
      }

      // handle case that this user was the last one to submit a time/compete
      if (checkRoomSolveFinished(room)) {
        handleSolveFinished(room);
        io.to(roomId.toString()).emit(SOCKET_SERVER.ROOM_UPDATE, room);
      }

      // remove the room from this socket.
      socket.leave(roomId);
      socket.roomId = undefined;
    }

    function getSocketRoom(): IRoom | undefined {
      if (!socket.roomId) return undefined;
      return rooms.get(socket.roomId);
    }

    socket.on(
      SOCKET_CLIENT.CREATE_ROOM,
      async (
        { roomSettings }: { roomSettings: IRoomSettings },
        callback: (roomId: string) => void
      ) => {
        let roomId: string = new ObjectId().toString();
        while (rooms.get(roomId)) {
          roomId = new ObjectId().toString();
        }
        const room: IRoom = await createRoom(roomSettings, roomId, socket.user);

        rooms.set(room.id, room);
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
        const room: IRoom | undefined = rooms.get(roomId);
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

        // don't need to update room store b/c modified room object in-place
        // TODO change this if no longer using in-memory room store

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
        const user: IUserInfo | undefined = users.get(userId);
        if (!user) {
          console.log(
            `Nonexistent user with id ${userId} attempting to join room ${roomId}.`
          );
          return;
        }

        //validate real room
        const room: IRoom | undefined = rooms.get(roomId);
        if (!room) {
          console.log(
            `User ${userId} trying to join nonexistent room ${roomId}`
          );
          joinRoomCallback(false, undefined, { INVALID_ROOM: "" });
          return;
        }

        //validate user is not already in this room
        if (
          Object.keys(room.users).includes(userId) &&
          room.users[userId].active
        ) {
          console.log(`User ${userId} double join in room ${roomId}.`);

          joinRoomCallback(true, room, {
            DUPLICATE_JOIN: "",
            EXISTING_USER_INFO: userId,
          });
          return;
        }

        //validate password if room is private AND user isn't host
        if (room.isPrivate && userId !== room.host?.id) {
          if (!password) {
            //this should only occur upon the first join_room ping - safe to return early
            joinRoomCallback(true, undefined, {});
            return;
          }

          //room password should never be undefined, but just in case, cast to empty string
          const correctPassword = await bcrypt.compare(
            password,
            room.password ?? ""
          );
          if (!correctPassword) {
            console.log(
              `User ${userId} submitted the wrong password to room ${roomId}.`
            );
            joinRoomCallback(true, undefined, { WRONG_PASSWORD: "" });
            return;
          }
        }
        // if this room is scheduled for deletion, don't delete it
        if (roomTimeouts.has(roomId)) {
          clearTimeout(roomTimeouts.get(roomId));
          roomTimeouts.delete(roomId);
        }

        //add user to room
        console.log(`User ${user.userName} joining room ${roomId}.`);

        const extraData: Record<string, string> = {};

        if (Object.hasOwn(room.users, userId)) {
          room.users[userId].active = true;
          room.users[userId].joinedAt = new Date();

          extraData["EXISTING_USER_INFO"] = userId;
        } else {
          const roomUser: IRoomUser = {
            user: user,
            points: 0,
            setWins: 0,
            joinedAt: new Date(),
            active: true,
            competing: true,
            userStatus: "IDLE",
            currentResult: undefined,
          };

          room.users[userId] = roomUser;
        }

        // if there is no host for some reason, promote this user to be host
        if (!room.host) {
          room.host = user;
        }

        socket.join(roomId);
        socket.roomId = roomId;
        joinRoomCallback(true, room, extraData);

        //broadcast update to all other users
        io.to(roomId).except(userId).emit(SOCKET_SERVER.ROOM_UPDATE, room);
      }
    );

    /**
     * Upon host pressing skip scramble button
     */
    socket.on(SOCKET_CLIENT.SKIP_SCRAMBLE, async () => {
      console.log(
        `User ${socket.user?.id} is trying to skip the scramble in room ${socket.roomId}.`
      );
      const room = getSocketRoom();
      if (!room) return;

      if (room.state == "STARTED") {
        await skipScramble(room);
        io.to(room.id).emit(SOCKET_SERVER.ROOM_UPDATE, room);
      } else {
        console.log(`Cannot skip scramble when room state is ${room.state}`);
      }
    });

    /**
     * Upon host starting the room
     */
    socket.on(SOCKET_CLIENT.START_ROOM, async () => {
      console.log(
        `User ${socket.user?.id} is trying to start room ${socket.roomId}.`
      );
      const room = getSocketRoom();
      if (!room) return;

      if (room.state == "WAITING" || room.state == "FINISHED") {
        room.state = "STARTED";
        await newRoomSolve(room);
        io.to(room.id.toString()).emit(SOCKET_SERVER.ROOM_UPDATE, room);
      } else {
        console.log(`Cannot start room when room state is ${room.state}`);
      }
    });

    /**
     * Upon host pressing reset button
     */
    socket.on(SOCKET_CLIENT.RESET_ROOM, () => {
      console.log(
        `User ${socket.user?.id} is trying to reset room ${socket.roomId}.`
      );
      const room = getSocketRoom();
      if (!room) return;

      if (room.state == "STARTED" || room.state == "FINISHED") {
        resetRoom(room);
        io.to(room.id.toString()).emit(SOCKET_SERVER.ROOM_UPDATE, room);
      } else {
        console.log(`Cannot reset room when room state is ${room.state}`);
      }
    });

    /**
     * Upon host pressing rematch button
     */
    socket.on(SOCKET_CLIENT.REMATCH_ROOM, async () => {
      console.log(
        `User ${socket.user?.id} is trying to rematch room ${socket.roomId}.`
      );

      const room = getSocketRoom();
      if (!room) return;

      if (room.state == "FINISHED") {
        resetRoom(room);
        room.state = "WAITING";
        io.to(room.id.toString()).emit(SOCKET_SERVER.ROOM_UPDATE, room);
      } else {
        console.log(
          `Cannot trigger a room rematch when room state is ${room.state}`
        );
      }
    });

    /**
     * Upon user updating their status
     */
    socket.on(
      SOCKET_CLIENT.UPDATE_SOLVE_STATUS,
      (newUserStatus: SolveStatus) => {
        if (socket.roomId && socket.user) {
          const room = rooms.get(socket.roomId);
          if (!room) return;

          const currentUserStatus: SolveStatus =
            room.users[socket.user?.id].userStatus;
          if (newUserStatus == currentUserStatus) {
            console.log(
              `User ${socket.user?.id} submitted new user status to room ${socket.roomId} which is the same as old user status.`
            );
          } else {
            console.log(
              `User ${socket.user?.userName} submitted new user status ${newUserStatus} to room ${socket.roomId}`
            );
            room.users[socket.user?.id].userStatus = newUserStatus;

            if (newUserStatus === "FINISHED") {
              const solveFinished: boolean = checkRoomSolveFinished(room);
              if (solveFinished) {
                handleSolveFinished(room);
              }
            }

            io.to(socket.roomId.toString()).emit(
              SOCKET_SERVER.ROOM_UPDATE,
              room
            );
          }
        }
      }
    );

    /**
     * Upon user starting any live timer option (only keyboard as of now)
     */
    socket.on(SOCKET_CLIENT.START_LIVE_TIMER, () => {
      if (socket.roomId && socket.user) {
        const room = rooms.get(socket.roomId);
        if (!room) return;

        io.to(socket.roomId.toString())
          .except(userId)
          .emit(SOCKET_SERVER.USER_START_LIVE_TIMER, userId);
      }
    });

    /**
     * Upon user stopping any live timer option (only keyboard as of now)
     */
    socket.on(SOCKET_CLIENT.STOP_LIVE_TIMER, () => {
      if (socket.roomId && socket.user) {
        const room = rooms.get(socket.roomId);
        if (!room) return;

        io.to(socket.roomId.toString())
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
          const room = rooms.get(socket.roomId);
          if (!room) return;

          if (room.state !== "STARTED") {
            console.log(
              `User ${socket.user?.id} tried to submit a result to ${socket.roomId} in the wrong room state. Ignoring message.`
            );
            return;
          }
          if (room.solves.length == 0) {
            console.log(
              `User ${socket.user?.id} tried to submit a result to ${socket.roomId} when there are no solves in the room.`
            );
            return;
          }

          console.log(
            `User ${socket.user?.userName} submitted new result ${result} to room ${socket.roomId}`
          );

          const solveObject: IRoomSolve = room.solves.at(-1)!;
          solveObject.solve.results[socket.user?.id] = result;

          // room.users[socket.user?.id].userStatus = "FINISHED";
          room.users[socket.user?.id].currentResult = result;

          io.to(socket.roomId.toString()).emit(SOCKET_SERVER.ROOM_UPDATE, room);
          onSuccessCallback?.();
        }
      }
    );

    /**
     * Upon user pressing compete/spectate button
     */
    socket.on(SOCKET_CLIENT.TOGGLE_COMPETING, (competing: boolean) => {
      if (socket.roomId && socket.user) {
        const room = rooms.get(socket.roomId);
        console.log("toggle call");
        if (!room || room.users[socket.user?.id].competing == competing) return;

        console.log(
          `User ${socket.user?.id} is now ${
            competing ? "competing" : "spectating"
          } in room ${socket.roomId}`
        );
        room.users[socket.user?.id].competing = competing;

        // when user spectates, need to check if all competing users are done, then advance room
        if (room.state === "STARTED") {
          const solveFinished: boolean = checkRoomSolveFinished(room);
          if (solveFinished) {
            handleSolveFinished(room);
          }
        }

        io.to(socket.roomId.toString()).emit(SOCKET_SERVER.ROOM_UPDATE, room);
      } else {
        console.log(
          `Either roomId or userId not set on socket: ${socket.roomId}, ${socket.user?.id}`
        );
      }
    });

    /**
     * User has left the room. Handle
     */
    socket.on(SOCKET_CLIENT.LEAVE_ROOM, (roomId: string) => {
      // console.log(
      //   `User ${socket.user?.userName} (${userId}) left room ${roomId} `
      // );
      handleRoomDisconnect(userId, roomId);
    });

    /**
     * Upon socket disconnection - automatically trigger on client closing all webpages
     */
    socket.on("disconnect", (reason) => {
      console.log(
        `User ${socket.user?.userName} (${userId}) disconnect from socket with reason: ${reason}`
      );
      //handle potential room DC
      if (socket.roomId) {
        handleRoomDisconnect(userId, socket.roomId);
      }

      //handle user DC
      handleUserDisconnect(userId);
    });
  });
};
