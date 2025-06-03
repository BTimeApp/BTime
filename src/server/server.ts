import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import next from "next";
import { config } from "./config";
import { connectToDB } from "@/server/database/database";
import {
  IRoom,
  RoomState,
  checkRoomSolveFinished,
  finishRoomSolve,
  newRoomSolve,
  resetRoom,
  skipScramble
} from "@/types/room";
import { Types } from "mongoose";
import { IRoomUser } from "@/types/roomUser";
import { IResult } from "@/types/result";
import { IUser } from "@/types/user";
import { ISolve } from "@/types/solve";
import { SolveStatus } from "@/types/status";
import { IRoomSolve } from "@/types/roomSolve";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

//defines useful state variables we want to maintain over the lifestyle of a socket connection (only visible server-side)
interface CustomSocket extends Socket {
  roomId?: Types.ObjectId;
  userId?: Types.ObjectId;
}

const rooms: Map<Types.ObjectId, IRoom> = new Map<Types.ObjectId, IRoom>(); // In-memory room store
const users: Map<Types.ObjectId, IUser> = new Map<Types.ObjectId, IUser>(); // In-memory user store

export async function startServer(): Promise<void> {
  await app.prepare();
  await connectToDB();

  const server = express();
  const httpServer = createServer(server);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket: CustomSocket) => {
    console.log("Connection established on server: ", socket.id);
    //by default, roomId and userId will be undefined

    function getSocketRoom(): IRoom | undefined {
      if (!socket.roomId) return undefined;
      return rooms.get(socket.roomId);
    }

    socket.on(
      "user_login",
      ({ userId, user }: { userId: Types.ObjectId; user: IUser }) => {
        if (users.get(userId)) {
          console.log(`User ${users.get(userId)!.userName} double login.`);
        } else {
          console.log(`User ${user.userName} is logging in.`);
          users.set(userId, user);
          socket.emit("user_logged_in");
        }
      }
    );

    socket.on("user_logout", ({ userId }: { userId: Types.ObjectId }) => {
      if (users.get(userId)) {
        console.log(`User ${users.get(userId)!.userName} logging out.`);
        users.delete(userId);
      } else {
        console.log(`Nonexistent user with id ${userId} is trying to log out.`);
      }
    });

    socket.on(
      "join_room",
      ({
        roomId,
        userId,
      }: {
        roomId: Types.ObjectId;
        userId: Types.ObjectId;
      }) => {
        if (!users.get(userId)) {
          console.log(
            `Nonexistent user with id ${userId} attempting to join room ${roomId}.`
          );
          return;
        }
        let user: IUser | undefined = users.get(userId);
        let room: IRoom | undefined = rooms.get(roomId);

        console.log(`User ${userId} is trying to join room ${roomId}.`);

        const roomUser: IRoomUser = {
          user: user!,
          points: 0,
          setWins: 0,
          joinedAt: new Date(),
          competing: true,
          userStatus: "IDLE",
          currentResult: undefined
        };

        // temporary - create the room if it doesn't exist.
        // TODO move this to a create_room event
        // TODO generate actual scramble
        if (!room) {
          room = {
            _id: roomId,
            roomName: roomId.toString(),
            host: user!,
            users: {},
            solves: [],
            currentSet: 1,
            currentSolve: 0,
            roomEvent: "333",
            roomFormat: "RACING",
            matchFormat: "BEST_OF", //how many sets to take to win
            setFormat: "FIRST_TO", //how to win a set
            nSets: 5, //number for match format
            nSolves: 5, //number for set format
            isPrivate: false,
            state: "WAITING",
            password: undefined,
          };
          rooms.set(roomId, room);
          
          //TODO - write to mongoDB
        }

        room.users[userId.toString()] = roomUser;

        socket.join(roomId.toString());
        socket.roomId = roomId;
        socket.userId = userId;


        io.to(roomId.toString()).emit("room_update", room);
      }
    );

    socket.on("skip_scramble", async () => {
      console.log(
        `User ${socket.userId} is trying to skip the scramble in room ${socket.roomId}.`
      );
      const room = getSocketRoom();
      if (!room) return;

      if (room.state == "STARTED") {
        await skipScramble(room);
        io.to(room._id.toString()).emit("room_update", room);
      } else {
        console.log(`Cannot skip scramble when room state is ${room.state}`);
      }
    })

    socket.on("start_room", async () => {
      console.log(
        `User ${socket.userId} is trying to start room ${socket.roomId}.`
      );
      const room = getSocketRoom();
      if (!room) return;

      if (room.state == "WAITING" || room.state == "FINISHED") {
        room.state = "STARTED";
        await newRoomSolve(room);
        io.to(room._id.toString()).emit("room_update", room);
      } else {
        console.log(`Cannot start room when room state is ${room.state}`);
      }
    });

    socket.on("reset_room", () => {
      console.log(
        `User ${socket.userId} is trying to reset room ${socket.roomId}.`
      );
      const room = getSocketRoom();
      if (!room) return;

      
      if (room.state == "STARTED" || room.state == "FINISHED") {
        resetRoom(room);
        io.to(room._id.toString()).emit("room_update", room);
      } else {
        console.log(`Cannot reset room when room state is ${room.state}`);
      }
    });

    socket.on("rematch_room", async () => {
      console.log(
        `User ${socket.userId} is trying to rematch room ${socket.roomId}.`
      );
      
      const room = getSocketRoom();
      if (!room) return;

      if (room.state == "FINISHED") {
        resetRoom(room);
        await newRoomSolve(room);
        room.state = "STARTED";
        console.log()
        io.to(room._id.toString()).emit("room_update", room);
      } else {
        console.log(`Cannot trigger a room rematch when room state is ${room.state}`);
      }
    });

    socket.on("user_update_status", (newUserStatus: SolveStatus) => {
      if (socket.roomId && socket.userId) {
        const room = rooms.get(socket.roomId);
        if (!room) return;

        const currentUserStatus: SolveStatus =
          room.users[socket.userId.toString()].userStatus;
        if (newUserStatus == currentUserStatus) {
          console.log(
            `User ${socket.userId} submitted new user status to room ${socket.roomId} which is the same as old user status.`
          );
        } else {
          console.log(`User ${socket.userId} submitted new user status ${newUserStatus} to room ${socket.roomId}`);
          room.users[socket.userId.toString()].userStatus = newUserStatus;
          io.to(socket.roomId.toString()).emit("room_update", room);
        }
      }
    });
    socket.on("user_submit_result", async (result: IResult) => {
      // we store results as an easily-serializable type and reconstruct on client when needed.
      // Socket.io does not preserve complex object types over the network, so it makes it hard to pass Result types around anyways.
      if (socket.roomId && socket.userId) {
        const room = rooms.get(socket.roomId);
        if (!room) return;

        if (room.state !== "STARTED") {
          console.log(
            `User ${socket.userId} tried to submit a result to ${socket.roomId} in the wrong room state. Ignoring message.`
          );
          return;
        }
        if (room.solves.length == 0) {
          console.log(
            `User ${socket.userId} tried to submit a result to ${socket.roomId} when there are no solves in the room.`
          );
          return;
        }

        let solveObject: IRoomSolve = room.solves.at(-1)!;
        solveObject.solve.results[socket.userId.toString()] = result;

        room.users[socket.userId.toString()].userStatus = "FINISHED";
        room.users[socket.userId.toString()].currentResult = result;

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
      if (socket.roomId && socket.userId) {
        const room = rooms.get(socket.roomId);
        console.log(room);
        if (
          !room ||
          room.users[socket.userId.toString()].competing == competing
        )
          return;

        console.log(
          `User ${socket.userId} is now ${
            competing ? "competing" : "spectating"
          } in room ${socket.roomId}`
        );
        room.users[socket.userId.toString()].competing = competing;
        io.to(socket.roomId.toString()).emit("room_update", room);
      } else {
        console.log(
          `Either roomId or userId not set on socket: ${socket.roomId}, ${socket.userId}`
        );
      }
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        users.delete(socket.userId);
      }

      if (socket.roomId && socket.userId) {
        const room = rooms.get(socket.roomId);
        if (!room) return;

        //remove user from room
        delete room.users[socket.userId.toString()];
        io.to(socket.roomId.toString()).emit("room_update", room);

        //check if no more users, if so, delete room.
        if (Object.keys(room.users).length == 0) {
          console.log(`Room ${socket.roomId} is empty. Deleting room.`);
          rooms.delete(socket.roomId);
          return;
        }

        //check if host, and if so, promote a new host
        if (room.host._id == socket.userId) {
          console.log(
            `Host has left room ${socket.roomId}. Promoting a new host.`
          );
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

  // Let Next.js handle all other requests
  server.use((req: Request, res: Response) => {
    return handle(req, res);
  });

  const PORT = config.server.port;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`> Server listening on http://0.0.0.0:${PORT}`);
  });
}
