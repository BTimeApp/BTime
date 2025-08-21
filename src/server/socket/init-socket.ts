import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { Types } from "mongoose";
import { rooms, users, UserSession } from "@/server/server-objects";
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
import { IUser } from "@/types/user";
import { IRoomUser } from "@/types/room-user";
import { IResult } from "@/types/result";
import { SolveStatus } from "@/types/status";
import { IRoomSolve } from "@/types/room-solve";
import { ServerResponse } from "http";
import { NextFunction } from "express";
import { ObjectId } from "bson";
import passport from "passport";
import bcrypt from "bcrypt";
import { userSessions } from "@/server/server-objects";

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
  io.on("connection", (socket: CustomSocket) => {
    //by default, roomId and userId will be undefined.

    //since we require a user to log in, access and set first.
    socket.user = socket.request.user;
    console.log(`User ${socket.user?.name} (${socket.user?.id}) connected via websocket.`);

    if (!socket.user) {
      console.log(`Socket received empty/undefined user. Disconnecting.`);
      socket.disconnect(true);
    }

    const userId = socket.user!.id;

    //user joins "their" room by default
    socket.join(userId);

    function getSocketRoom(): IRoom | undefined {
      if (!socket.roomId) return undefined;
      return rooms.get(socket.roomId);
    }

    async function handleSolveFinished(room: IRoom) {
      finishRoomSolve(room);
      io.to(room.id).emit("solve_finished");
      if ((room.state as RoomState) !== "FINISHED") {
        await newRoomSolve(room);
      }
    }

    function handleDisconnect() {
      // TODO - this logic may be moved to an express API call later
      if (socket.roomId && socket.user) {
        const room = rooms.get(socket.roomId);
        if (!room) return;

        //remove user from room
        delete room.users[userId];
        io.to(socket.roomId.toString()).emit("room_update", room);

        //check if no more users, if so, delete room.
        if (Object.keys(room.users).length == 0) {
          console.log(`Room ${socket.roomId} is empty. Deleting room.`);
          rooms.delete(socket.roomId);
          return;
        }

        //check if user is host OR there is somehow no host.
        if ((room.host && room.host.id == userId) || !room.host) {
          if (room.host) {
            console.log(
              `Host has left room ${socket.roomId}. Promoting a new host.`
            );
          } else {
            console.log(
              `User left room without a host: ${socket.roomId}. Promoting a new host.`
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
          console.log(
            `Room ${socket.roomId} promoted a new host: ${room.host}.`
          );
          io.to(socket.roomId.toString()).emit("room_update", room);
        }

        //delete the user's submission for most recent solve, if it exists
        delete room.solves.at(-1)?.solve.results?.[userId];

        // handle case that this user was the last one to submit a time/compete
        if (checkRoomSolveFinished(room)) {
          handleSolveFinished(room);
          io.to(socket.roomId.toString()).emit("room_update", room);
        }
      }
    }

    socket.on(
      "create_room",
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
      "update_room",
      async (
        roomSettings: IRoomSettings,
        roomId: string,
        userId: string,
        onSuccessCallback?: () => void
      ) => {
        const room: IRoom | undefined = rooms.get(roomId);
        if (!room || userId !== room.host?.id) {
          console.log(userId, room?.host);
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
        io.to(roomId).emit("room_update", room);

        // upon successful update, call success callback
        onSuccessCallback?.();
      }
    );

    socket.on(
      "join_room",
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
        const user: IUser | undefined = users.get(userId);
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
        if (Object.keys(room.users).includes(userId)) {
          console.log(`User ${userId} double join in room ${roomId}.`);

          //clear any session DC/RC related timeouts
          if (!userSessions.get(userId)) {
            // create a map for this user
            userSessions.set(userId, new Map<string, UserSession>());
          } else {
            // clear the timeout associated with this user-room combo so we don't actually DC them
            clearTimeout(userSessions.get(userId)?.get(roomId)?.timeout);
          }

          joinRoomCallback(true, room, { DUPLICATE_JOIN: "" });
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
        //clear any session DC/RC related timeouts
        if (!userSessions.get(userId)) {
          // create a map for this user
          userSessions.set(userId, new Map<string, UserSession>());
        } else {
          // clear the timeout associated with this user-room combo so we don't actually DC them
          clearTimeout(userSessions.get(userId)?.get(roomId)?.timeout);
        }

        //add user to room
        console.log(`User ${userId} joining room ${roomId}.`);

        const roomUser: IRoomUser = {
          user: user,
          points: 0,
          setWins: 0,
          joinedAt: new Date(),
          competing: true,
          userStatus: "IDLE",
          currentResult: undefined,
        };

        room.users[userId] = roomUser;

        // if there is no host for some reason, promote this user to be host
        if (!room.host) {
          room.host = user;
        }

        socket.join(roomId);
        socket.roomId = roomId;
        joinRoomCallback(true, room, {});

        //broadcast update to all other users
        io.to(roomId).except(userId).emit("room_update", room);
      }
    );

    /**
     * Upon host pressing skip scramble button
     */
    socket.on("skip_scramble", async () => {
      console.log(
        `User ${socket.user?.id} is trying to skip the scramble in room ${socket.roomId}.`
      );
      const room = getSocketRoom();
      if (!room) return;

      if (room.state == "STARTED") {
        await skipScramble(room);
        io.to(room.id).emit("room_update", room);
      } else {
        console.log(`Cannot skip scramble when room state is ${room.state}`);
      }
    });

    /**
     * Upon host starting the room
     */
    socket.on("start_room", async () => {
      console.log(
        `User ${socket.user?.id} is trying to start room ${socket.roomId}.`
      );
      const room = getSocketRoom();
      if (!room) return;

      if (room.state == "WAITING" || room.state == "FINISHED") {
        room.state = "STARTED";
        await newRoomSolve(room);
        io.to(room.id.toString()).emit("room_update", room);
      } else {
        console.log(`Cannot start room when room state is ${room.state}`);
      }
    });

    /**
     * Upon host pressing reset button
     */
    socket.on("reset_room", () => {
      console.log(
        `User ${socket.user?.id} is trying to reset room ${socket.roomId}.`
      );
      const room = getSocketRoom();
      if (!room) return;

      if (room.state == "STARTED" || room.state == "FINISHED") {
        resetRoom(room);
        io.to(room.id.toString()).emit("room_update", room);
      } else {
        console.log(`Cannot reset room when room state is ${room.state}`);
      }
    });

    /**
     * Upon host pressing rematch button
     */
    socket.on("rematch_room", async () => {
      console.log(
        `User ${socket.user?.id} is trying to rematch room ${socket.roomId}.`
      );

      const room = getSocketRoom();
      if (!room) return;

      if (room.state == "FINISHED") {
        resetRoom(room);
        room.state = "WAITING";
        io.to(room.id.toString()).emit("room_update", room);
      } else {
        console.log(
          `Cannot trigger a room rematch when room state is ${room.state}`
        );
      }
    });

    /**
     * Upon user updating their status
     */
    socket.on("user_update_status", (newUserStatus: SolveStatus) => {
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

          io.to(socket.roomId.toString()).emit("room_update", room);
        }
      }
    });

    /**
     * Upon user starting any live timer option (only keyboard as of now)
     */
    socket.on("user_start_live_timer", () => {
      if (socket.roomId && socket.user) {
        const room = rooms.get(socket.roomId);
        if (!room) return;

        io.to(socket.roomId.toString()).except(userId).emit("user_started_live_timer", userId);
      }
    });

    /**
     * Upon user stopping any live timer option (only keyboard as of now)
     */
    socket.on("user_stop_live_timer", () => {
      if (socket.roomId && socket.user) {
        const room = rooms.get(socket.roomId);
        if (!room) return;

        io.to(socket.roomId.toString()).except(userId).emit("user_stopped_live_timer", userId);
      }
    });

    /**
     * Upon user submitting a new result
     */
    socket.on(
      "user_submit_result",
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

          io.to(socket.roomId.toString()).emit("room_update", room);
          onSuccessCallback?.();
        }
      }
    );

    /**
     * Upon user pressing compete/spectate button
     */
    socket.on("user_toggle_competing_spectating", (competing: boolean) => {
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

        io.to(socket.roomId.toString()).emit("room_update", room);
      } else {
        console.log(
          `Either roomId or userId not set on socket: ${socket.roomId}, ${socket.user?.id}`
        );
      }
    });

    /**
     * Upon user disconnecting from a room
     */
    socket.on("user_disconnect", () => {
      if (socket.roomId) {
        console.log(`User ${userId} disconnect from room ${socket.roomId}`)
        if (!userSessions.get(userId)) {
          userSessions.set(userId, new Map<string, UserSession>());
        }

        userSessions.get(userId)!.set(socket.roomId, {
          timeout: setTimeout(() => {
            handleDisconnect();
            userSessions.get(userId)?.delete(socket.roomId!);
          }, 1000),
        }); //wait for 1 second before actually DCing user
      }
    });

    /**
     * Upon socket disconnection - automatically trigger on client closing all webpages
     */
    socket.on("disconnect", () => {
      console.log(`User ${socket.user?.userName} (${userId}) disconnect from socket`)

      if (socket.roomId) {  
        if (!userSessions.get(userId)) {
          userSessions.set(userId, new Map<string, UserSession>());
        }

        userSessions.get(userId)!.set(socket.roomId, {
          timeout: setTimeout(() => {
            handleDisconnect();
            userSessions.get(userId)?.delete(socket.roomId!);
          }, 2000),
        }); //wait for 2 seconds before actually DCing user)
      }
    });
  });
};
