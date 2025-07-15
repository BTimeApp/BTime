import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { Types } from "mongoose";
import { rooms, users } from "@/server/server_objects";
import {
  IRoom,
  RoomState,
  IRoomSettings,
} from "@/types/room";
import {
  skipScramble,
  newRoomSolve,
  resetRoom,
  finishRoomSolve,
  checkRoomSolveFinished,
  createRoom
} from "@/lib/room";
import { IUser } from "@/types/user";
import { IRoomUser } from "@/types/roomUser";
import { IResult } from "@/types/result";
import { SolveStatus } from "@/types/status";
import { IRoomSolve } from "@/types/roomSolve";
import { ServerResponse } from "http";
import { NextFunction } from "express";
import { ObjectId } from "bson";
import passport from "passport";
import bcrypt from "bcrypt";

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
      credentials: true
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
    console.log(`User connected to socket: ${JSON.stringify(socket.user)}`);

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
        const room: IRoom = await createRoom({
          roomSettings: roomSettings,
          roomId: roomId,
          initialHost: socket.user,
        });

        rooms.set(room.id, room);
        callback(roomId);
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
        passwordValidationCallback: (passwordValid: boolean, roomIdValid: boolean, room?: IRoom) => void
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
          passwordValidationCallback(false, false, undefined);
          return;
        }

        //validate user is not already in this room
        if (Object.keys(room.users).includes(userId)) {
          console.log(
            `User ${userId} double join in room ${roomId}.`
          );
          passwordValidationCallback(true, true, room);
          return;
        }

        //validate password if room is private AND user isn't host
        if (room.isPrivate && userId !== room.host?.id) {
          if (!password) {
            console.log(`User ${userId} an empty password to room ${roomId}.`);
            passwordValidationCallback(false, true, undefined);
            return;
          } else if (!room.password) {
            console.log(`User ${userId} submitted the wrong password to room ${roomId}.`);
            passwordValidationCallback(false, true, undefined);
            return;
          }
          
          const passwordValid = await bcrypt.compare(password, room.password);
          if (!passwordValid) {
            console.log(`User ${userId} submitted the wrong password to room ${roomId}.`);
            passwordValidationCallback(false, true, undefined);
            return;
          }
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
        socket.join(roomId);
        socket.roomId = roomId;
        passwordValidationCallback(true, true, room);

        //broadcast update to all other users
        io.to(roomId).except(userId).emit("room_update", room);
      }
    );

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

    socket.on("rematch_room", async () => {
      console.log(
        `User ${socket.user?.id} is trying to rematch room ${socket.roomId}.`
      );

      const room = getSocketRoom();
      if (!room) return;

      if (room.state == "FINISHED") {
        resetRoom(room);
        await newRoomSolve(room);
        room.state = "STARTED";
        console.log();
        io.to(room.id.toString()).emit("room_update", room);
      } else {
        console.log(
          `Cannot trigger a room rematch when room state is ${room.state}`
        );
      }
    });

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
            `User ${socket.user?.id} submitted new user status ${newUserStatus} to room ${socket.roomId}`
          );
          room.users[socket.user?.id].userStatus = newUserStatus;
          // Do not reflect user status back to the same user that triggered this update!
          // This will cause the timer component to be re-mounted since the page component re-renders on room state change
          io.to(socket.roomId.toString())
            .except(userId)
            .emit("room_update", room);
        }
      }
    });
    socket.on("user_submit_result", async (result: IResult) => {
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

        const solveObject: IRoomSolve = room.solves.at(-1)!;
        solveObject.solve.results[socket.user?.id] = result;

        room.users[socket.user?.id].userStatus = "FINISHED";
        room.users[socket.user?.id].currentResult = result;

        //TODO - if all users are done, update set and solve counts...
        const solveFinished: boolean = checkRoomSolveFinished(room);
        if (solveFinished) {
          finishRoomSolve(room);
          io.to(socket.roomId.toString()).emit("solve_finished");
          if ((room.state as RoomState) !== "FINISHED") {
            await newRoomSolve(room);
          }
        }
        io.to(socket.roomId.toString()).emit("room_update", room);
      }
    });

    socket.on("user_toggle_competing_spectating", (competing: boolean) => {
      if (socket.roomId && socket.user) {
        const room = rooms.get(socket.roomId);
        if (!room || room.users[socket.user?.id].competing == competing) return;

        console.log(
          `User ${socket.user?.id} is now ${
            competing ? "competing" : "spectating"
          } in room ${socket.roomId}`
        );
        room.users[socket.user?.id].competing = competing;
        io.to(socket.roomId.toString()).emit("room_update", room);
      } else {
        console.log(
          `Either roomId or userId not set on socket: ${socket.roomId}, ${socket.user?.id}`
        );
      }
    });

    socket.on("disconnect", () => {
      // TODO - this logic may be moved to an express API call later
      if (socket.roomId && socket.user) {
        const room = rooms.get(socket.roomId);
        if (!room) return;

        //remove user from room
        delete room.users[socket.user?.id];
        io.to(socket.roomId.toString()).emit("room_update", room);

        //check if no more users, if so, delete room.
        if (Object.keys(room.users).length == 0) {
          console.log(`Room ${socket.roomId} is empty. Deleting room.`);
          rooms.delete(socket.roomId);
          return;
        }

        //check if user is host OR there is somehow no host.
        if ((room.host && room.host.id == socket.user.id) || !room.host) {
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
      }
    });
  });
};
