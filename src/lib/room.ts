import { IRoom, IRoomSettings } from "@/types/room";
import { ISolve } from "@/types/solve";
import { IRoomSolve } from "@/types/room-solve";
import { IResult, Result } from "@/types/result";
import { generateScramble } from "@/lib/utils";
import { IUser } from "@/types/user";
import { ObjectId } from "bson";
import bcrypt from "bcrypt";

export async function createRoom({roomSettings, roomId, initialHost}: {roomSettings: IRoomSettings, roomId?: string, initialHost?: IUser}): Promise<IRoom> {
    const room: IRoom = {
      id: roomId ? roomId : new ObjectId().toString(),
      roomName: roomSettings.roomName,
      host: initialHost,
      users: {}, 
      solves: [],
      roomEvent: roomSettings.roomEvent,
      roomFormat: roomSettings.roomFormat,
      currentSet: 1, 
      currentSolve: 0,
      isPrivate: roomSettings.isPrivate,
      state: "WAITING", 
    }
  
    if (roomSettings.roomFormat == "RACING") { 
      room.matchFormat = roomSettings.matchFormat;
      room.setFormat = roomSettings.setFormat;
      room.nSets = roomSettings.nSets;
      room.nSolves = roomSettings.nSolves;
    }
  
    if (roomSettings.isPrivate) {
      room.password = roomSettings.password 
        ? await bcrypt.hash(roomSettings.password, 10)
        : undefined;
    }
  
    return room;
  }
  
  /**
   * check if there is a set winner. return all set winner(s), although it should be rare to have multiple.
   */
  export function findSetWinners(room: IRoom): string[] {
    //no set wins when room is a casual room
    if (room.roomFormat == "CASUAL") return [];
    const competingUsers = Object.values(room.users).filter(
      (user) => user.competing
    );
    //no set win possible if no competing users exist
    if (competingUsers.length == 0) return [];
  
    switch (room.setFormat) {
      case "BEST_OF":
        //user has won for sure if they have the majority of solves
        return competingUsers
          .filter((roomUser) => roomUser.points > room.nSolves! / 2)
          .map((roomUser) => {
            return roomUser.user.id;
          });
      case "FIRST_TO":
        //user has won only when they win n solves.
        return competingUsers
          .filter((roomUser) => roomUser.points >= room.nSolves!)
          .map((roomUser) => {
            return roomUser.user.id;
          });
      case "AVERAGE_OF": {
        //requires that competing user have done ALL solves in this set
        const setSolves = room.solves.filter((roomSolve) => roomSolve.setIndex == room.currentSet);
        if (setSolves.length < (room.nSolves || Number.POSITIVE_INFINITY))
          return [];
  
        let currentIds = new Set(
          competingUsers.map((roomUser) => {
            return roomUser.user.id;
          })
        );
        for (const roomSolve of setSolves) {
          const competedIds = new Set(Object.keys(roomSolve.solve.results));
          currentIds = currentIds.intersection(competedIds);
        }
        const eligibleIds = [...currentIds];
  
        if (eligibleIds.length == 0) return [];
  
        const results: Record<string, Result[]> = eligibleIds.reduce(
          (acc, id) => {
            acc[id] = setSolves.map((roomSolve) =>
              Result.fromIResult(roomSolve.solve.results[id])
            );
            return acc;
          },
          {} as Record<string, Result[]>
        );
  
        const averages: Record<string, number> = Object.fromEntries(
          eligibleIds.map((id) => [id, Result.averageOf(results[id])])
        );
  
        const minAverage = Math.min(...Object.values(averages));
  
        return eligibleIds.filter((uid) => averages[uid] === minAverage);
      }
      case "MEAN_OF": {
        //requires that competing user have done ALL solves in this set
        const setSolves = room.solves.filter((roomSolve) => roomSolve.setIndex == room.currentSet);
        if (setSolves.length < (room.nSolves || Number.POSITIVE_INFINITY))
          return [];
  
        let currentIds = new Set(
          competingUsers.map((roomUser) => {
            return roomUser.user.id;
          })
        );
        for (const roomSolve of setSolves) {
          const competedIds = new Set(Object.keys(roomSolve.solve.results));
          currentIds = currentIds.intersection(competedIds);
        }
        const eligibleIds = [...currentIds];
  
        if (eligibleIds.length == 0) return [];
  
        const results: Record<string, Result[]> = eligibleIds.reduce(
          (acc, id) => {
            acc[id] = setSolves.map((roomSolve) =>
              Result.fromIResult(roomSolve.solve.results[id])
            );
            return acc;
          },
          {} as Record<string, Result[]>
        );
  
        const means: Record<string, number> = Object.fromEntries(
          eligibleIds.map((id) => [id, Result.meanOf(results[id])])
        );
  
        const minMean = Math.min(...Object.values(means));
  
        return eligibleIds.filter((uid) => means[uid] === minMean);
      }
      default:
        return [];
    }
  }
  
  /**
   * check if there is a match winner. return all match winner(s), although it should be rare to have multiple. Returns usernames instead of user IDs.
   */
  export function findMatchWinners(room: IRoom): string[] {
    //no set wins when room is a casual room
    if (room.roomFormat == "CASUAL") return [];
    const competingUsers = Object.values(room.users).filter(
      (user) => user.competing
    );
    //no set win possible if no competing users exist
    if (competingUsers.length == 0) return [];
  
    switch (room.matchFormat) {
      case "BEST_OF":
        //user has won for sure if they have the majority of solves
        return competingUsers
          .filter((roomUser) => roomUser.setWins > room.nSets! / 2)
          .map((roomUser) => {
            return roomUser.user.userName;
          });
      case "FIRST_TO":
        //user has won only when they win n solves.
        return competingUsers
          .filter((roomUser) => roomUser.setWins >= room.nSets!)
          .map((roomUser) => {
            return roomUser.user.userName;
          });
      default:
        return [];
    }
  }
  
  /** Checks if the current solve is done.
   *
   */
  export function checkRoomSolveFinished(room: IRoom): boolean {
    if (room.solves.length == 0) return false;
    const currentSolve = room.solves.at(-1);
    const competingUsers = Object.values(room.users).filter(
      (user) => user.competing
    );
  
    let allUsersFinished: boolean = true;
    for (const roomUser of competingUsers) {
      if (
        roomUser.userStatus !== "FINISHED" ||
        !Object.keys(currentSolve!.solve.results).includes(roomUser.user.id)
      ) {
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
  export function finishRoomSolve(room: IRoom) {
    if (room.solves.length == 0) return;
  
    const currentSolve = room.solves.at(-1);
    if (!currentSolve) {
      console.log(`finishRoomSolve: room ${room.id} has no currentSolve to finish`);
      return;
    } 
    const currentResults = currentSolve.solve.results;

    if (room.setFormat == "BEST_OF" || room.setFormat == "FIRST_TO") {
      const eligibleResults: [string, IResult][] = Object.entries(currentResults).filter(([userId, result]) => room.users[userId]?.competing);

      let fastest_uid = null;
      let fastest_result: Result | undefined = undefined;

      for (const [userId, iResult] of eligibleResults) {
        const result: Result = Result.fromIResult(iResult);
        if ((result.getPenalty() !== "DNF") && (!fastest_result || result.isLessThan(fastest_result))) {
          fastest_uid = userId;
          fastest_result = result;
        }
      }

      if (fastest_result) {
        if (!fastest_uid || !fastest_result) {
          console.log(`Room ${room.id} has no winner for current solve. `);
          return;
        }
        currentSolve.solveWinner = fastest_uid;
        room.users[fastest_uid].points += 1;
      }
    }
    
  

    // const competingUsers = Object.values(room.users).filter(
    //   (user) => user.competing
    // );
  
    // if (competingUsers.length == 0) {
    //   console.log(
    //     `Room ${room.id} has 0 competing users and cannot complete the current solve`
    //   );
    //   return;
    // }
    // if (room.setFormat == "BEST_OF" || room.setFormat == "FIRST_TO") {
    //   let fastest_uid = null;
    //   let fastest_result: Result | undefined = undefined;
  
    //   for (const roomUser of competingUsers) {
    //     const result: Result = Result.fromIResult(
    //       currentSolve.solve.results[roomUser.user.id]
    //     );
    //     if (result && (!fastest_result || result.isLessThan(fastest_result))) {
    //       //expected behavior: ties are broken by the first user to submit the time.
    //       //current behavior: ties are broken by the first user in the competingUsers list (generally the earlier one to join the room). TODO - fix
    //       fastest_uid = roomUser.user.id;
    //       fastest_result = result;
    //     }
    //   }
  
    //   // 0 users means return
    //   if (!fastest_uid || !fastest_result) {
    //     console.log(`Room ${room.id} has no winner for current solve. `);
    //     return;
    //   }
    //   currentSolve.solveWinner = fastest_uid;
    //   room.users[fastest_uid].points += 1;
    // }
  
    // check for any set winners. if so, update room accordingly.
    const setWinners: string[] = findSetWinners(room);
    currentSolve.setWinners = setWinners;
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
  
        //reset number of solves users have won
        Object.values(room.users).map((roomUser) => {
          roomUser.points = 0;
        });
      }
    }
  }
  
  /** Generates a new solve for a room and its users. Does not update wins or points
   *
   *
   */
  export async function newRoomSolve(room: IRoom) {
    //get current solve Id. Consider storing a currentSolveId field in the room to not need to do this
    const currSolveId = getCurrentSolveId(room);
  
    const newScramble: string = await generateScramble(room.roomEvent);
    const solveObj: ISolve = {
      id: currSolveId + 1,
      scramble: newScramble,
      results: {},
    }
    const newSolve: IRoomSolve = {
      solve: solveObj,
      setIndex: room.currentSet,
      solveIndex: room.currentSolve + 1,
    };
    room.currentSolve += 1;
    room.solves.push(newSolve);
  
    Object.values(room.users).map((roomUser) => {
      roomUser.currentResult = undefined;
    });
  }
  
  export async function skipScramble(room: IRoom) {
    if (room.solves.length == 0) return;
  
    room.solves.at(-1)!.solve.scramble = await generateScramble(room.roomEvent);
    room.solves.at(-1)!.solve.results = {};
  }
  
  /**
   * Resets the room
   */
  export function resetRoom(room: IRoom) {
    room.state = "WAITING";
    room.solves = [];
    room.currentSet = 1;
    room.currentSolve = 0;
    room.winners = room.roomFormat == "RACING" ? [] : undefined;
  
    Object.values(room.users).map((roomUser) => {
      roomUser.points = 0;
      roomUser.setWins = 0;
      roomUser.userStatus = "IDLE";
      roomUser.currentResult = undefined;
    });
  }
  
  function getCurrentSolveId(room: IRoom) {
    if (room.solves.length == 0) return 0;
    return room.solves.at(-1)!.solve.id;
  }