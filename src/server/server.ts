import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import next from "next";
import { config } from "./config";
import { connectToDB } from "@/server/database/database";
import {
  findMatchWinners,
  findSetWinners,
  IRoom,
  RoomState,
} from "@/types/room";
import { Types } from "mongoose";
import { IRoomUser } from "@/types/roomUser";
import { IResult, Result } from "@/types/result";
import { IUser } from "@/types/user";
import { ISolve } from "@/types/solve";
import { SolveStatus } from "@/types/status";
import { generateScramble } from "@/lib/utils";

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

/** Checks if the current solve is done.
 *
 */
function checkRoomSolveFinished(room: IRoom): boolean {
  const currentSolve = room.solves[room.currentSet - 1][room.currentSolve - 1];
  const competingUsers = Object.values(room.users).filter(
    (user) => user.competing
  );

  let allUsersFinished: boolean = true;
  for (const user of competingUsers) {
    if ( user.userStatus !== "FINISHED" || !Object.keys(currentSolve.results).includes(user.user._id.toString()) ) {
      allUsersFinished = false;
      break;
    }
  }

  //we do not set user status in here b/c the transition depends on client factors (e.g. timer type).
  //user status update is handled in client, and we should send the "solve_finished" update to the whole room to help
  return allUsersFinished;
}

/**
 *  Find the winner of the current solve. Award a point and process necessary consequences (set win, race win)
 */
function finishRoomSolve(room: IRoom) {

  const currentSolve = room.solves[room.currentSet - 1][room.currentSolve - 1];
  const competingUsers = Object.values(room.users).filter(
    (user) => user.competing
  );

  if (competingUsers.length == 0) {
    console.log(
      `Room ${room._id} has 0 competing users and cannot complete the current solve`
    );
    return;
  }

  let fastest_uid = null;
  let fastest_result: Result | undefined = undefined;

  for (const user of competingUsers) {
    const result: Result = Result.fromIResult(
      currentSolve.results[user.user._id.toString()]
    );
    if (!fastest_result || result.isLessThan(fastest_result)) {
      fastest_uid = user.user._id.toString();
      fastest_result = result;
    }
  }

  // 0 users means return
  if (!fastest_uid || !fastest_result) {
    console.log(`Room ${room._id} has no winner for current solve. `);
    return;
  }

  if (room.setFormat == "AVERAGE_OF" || room.setFormat == "MEAN_OF") {
    // do not reward points in AoN or MoN formats.
    return;
  }
  room.users[fastest_uid].points += 1;

  const setWinners: string[] = findSetWinners(room);
  if (setWinners.length > 0) {
    //update set wins for these users
    setWinners.map((uid) => (room.users[uid].setWins += 1));

    const matchWinners: string[] = findMatchWinners(room);
    if (matchWinners.length > 0) {
      //handle match win
      room.winners = matchWinners;
      room.state = "FINISHED";
    } else {
      //reset solve counter, update set counter
      room.currentSolve = 0;
      room.currentSet += 1;
      room.solves.push([]);
    }
  }
}

/** Generates a new solve for a room and its users. Does not update wins or points
 *
 *
 */
async function newRoomSolve(room: IRoom) {

  //get current solve Id. Consider storing a currentSolveId field in the room to not need to do this
  let currSolveId: number = 0;
  if (room.solves[room.currentSet - 1].length > 0) {
    currSolveId = room.solves[room.currentSet - 1][room.currentSolve - 1].id;
  } else if (room.currentSet > 1) {
    currSolveId = room.solves[room.currentSet - 2][room.currentSolve - 1].id;
  }

  const newScramble: string = await generateScramble(room.roomEvent);
  const newSolve: ISolve = {
    id: currSolveId + 1,
    scramble: newScramble,
    results: {},
  };

  room.currentSolve += 1;
  room.solves.at(-1)?.push(newSolve);
}

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
            solves: [[]],
            currentSet: 1,
            currentSolve: 0,
            roomEvent: "333",
            roomFormat: "RACING",
            matchFormat: "BEST_OF", //how many sets to take to win
            setFormat: "BEST_OF", //how to win a set
            nSets: 1, //number for match format
            nSolves: 1, //number for set format
            isPrivate: false,
            state: "WAITING",
            password: undefined,
          };
          rooms.set(roomId, room);
          
          //TODO - write to mongoDB
        }

        room.users[userId.toString()] = roomUser;
        newRoomSolve(room);

        socket.join(roomId.toString());
        socket.roomId = roomId;
        socket.userId = userId;


        io.to(roomId.toString()).emit("room_update", room);
      }
    );

    socket.on("start_room", () => {
      console.log(
        `User ${socket.userId} is trying to start room ${socket.roomId}.`
      );
      if (socket.roomId) {
        const room = rooms.get(socket.roomId);
        if (room) {
          if (room.state == "WAITING") {
            room.state = "STARTED";
            io.to(socket.roomId.toString()).emit("room_update", room);
          } else {
            console.log(`Cannot start room when room state is ${room.state}`);
          }
        }
      }
    });

    socket.on("reset_room", () => {
      console.log(
        `User ${socket.userId} is trying to reset room ${socket.roomId}.`
      );
      if (socket.roomId) {
        const room = rooms.get(socket.roomId);
        if (room) {
          if (room.state == "STARTED" || room.state == "FINISHED") {
            room.state = "WAITING";
            room.solves = [[]];
            room.currentSet = 1;
            room.currentSolve = 0;
            newRoomSolve(room);
            io.to(socket.roomId.toString()).emit("room_update", room);
          } else {
            console.log(`Cannot reset room when room state is ${room.state}`);
          }
        }
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
    socket.on("user_submit_result", (result: IResult) => {
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

        let solveObject: ISolve =
          room.solves[room.currentSet - 1][room.currentSolve - 1];
        solveObject.results[socket.userId.toString()] = result;
        room.users[socket.userId.toString()].userStatus = "FINISHED";

        //TODO - if all users are done, update set and solve counts...
        const solveFinished: boolean = checkRoomSolveFinished(room);
        console.log("Solve Finished", solveFinished, room.solves[0][0].results);
        if (solveFinished) {
          finishRoomSolve(room);
          if ((room.state as RoomState) !== "FINISHED") {
            newRoomSolve(room);
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
