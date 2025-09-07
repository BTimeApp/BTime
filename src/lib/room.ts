import { IRoom, IRoomSettings } from "@/types/room";
import { ISolve } from "@/types/solve";
import { IRoomSolve } from "@/types/room-solve";
import { IResult, Result } from "@/types/result";
import { generateScramble } from "@/lib/utils";
import { IUser } from "@/types/user";
import { ObjectId } from "bson";
import bcrypt from "bcrypt";

export async function createRoom(
  roomSettings: IRoomSettings,
  roomId?: string,
  initialHost?: IUser
): Promise<IRoom> {
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
  };

  if (roomSettings.roomFormat !== "CASUAL") {
    room.matchFormat = roomSettings.matchFormat;
    room.setFormat = roomSettings.setFormat;
    room.nSets = roomSettings.nSets;
    room.nSolves = roomSettings.nSolves;
  }

  if (roomSettings.isPrivate) {
    room.password = roomSettings.password
      ? await bcrypt.hash(roomSettings.password, 10)
      : ""; //never let a private room have an undefined password
  }

  return room;
}

export async function updateRoom(
  room: IRoom,
  newRoomSettings: IRoomSettings
): Promise<void> {
  room.roomName = newRoomSettings.roomName;
  room.roomEvent = newRoomSettings.roomEvent;
  room.roomFormat = newRoomSettings.roomFormat;
  room.isPrivate = newRoomSettings.isPrivate;

  if (newRoomSettings.roomFormat !== "CASUAL") {
    room.matchFormat = newRoomSettings.matchFormat;
    room.setFormat = newRoomSettings.setFormat;
    room.nSets = newRoomSettings.nSets;
    room.nSolves = newRoomSettings.nSolves;
  }

  if (newRoomSettings.isPrivate) {
    room.password = newRoomSettings.password
      ? await bcrypt.hash(newRoomSettings.password, 10)
      : undefined;
  }
}

export function checkRoomUpdateRequireReset(
  room: IRoom,
  roomSettings: IRoomSettings
): boolean {
  let needsReset = true;
  if (room.roomFormat === "CASUAL" && roomSettings.roomFormat === "CASUAL") {
    // don't need to reset casual rooms
    needsReset = false;
  } else if (
    room.roomFormat === roomSettings.roomFormat &&
    room.matchFormat === roomSettings.matchFormat &&
    room.setFormat === roomSettings.setFormat &&
    room.roomEvent === roomSettings.roomEvent &&
    room.nSets === roomSettings.nSets &&
    room.nSolves === roomSettings.nSolves
  ) {
    // allowed to edit room name, privacy, password at any time
    needsReset = false;
  }
  return needsReset;
}

/**
 * Check if the current set (given by room.currentSet) is finished.
 * This function should be run BEFORE finding set winners and awarding set wins.
 */
export function checkSetFinished(room: IRoom): boolean {
  /**
   * Under current set formats:
   * Ao/Mo - only way to finish the set is to do all solves.
   * Bo - either finish all solves, or someone has to take majority (> N / 2) of points available
   * Ft - someone has to get at least N points
   */
  if (room.solves.length === 0) return false;
  const currentSolve = room.solves.at(-1)!;

  switch (room.setFormat) {
    case "AVERAGE_OF":
      return (
        currentSolve.finished &&
        currentSolve.solveIndex === room.nSolves &&
        currentSolve.setIndex === room.currentSet
      );
    case "MEAN_OF":
      return (
        currentSolve.finished &&
        currentSolve.solveIndex === room.nSolves &&
        currentSolve.setIndex === room.currentSet
      );
    case "BEST_OF":
      return (
        Object.values(room.users).filter(
          (roomUser) => roomUser.points > room.nSolves! / 2
        ).length > 0 ||
        (currentSolve.finished &&
          currentSolve.solveIndex === room.nSolves &&
          currentSolve.setIndex === room.currentSet)
      );
    case "FIRST_TO":
      return (
        Object.values(room.users).filter(
          (roomUser) => roomUser.points >= room.nSolves!
        ).length > 0
      );
    default:
      return false;
  }
}

/**
 * check if there is a set winner.
 * return all set winner(s), although it should be rare to have multiple.
 * This function should ONLY be called the set is considered finished.
 */
export function findSetWinners(room: IRoom): string[] {
  //no set wins when room is a casual room
  if (room.roomFormat == "CASUAL") return [];

  const competingUsers = Object.values(room.users).filter(
    (user) => user.competing && user.active
  );

  //no set win possible if no competing users exist
  if (competingUsers.length == 0) return [];

  switch (room.setFormat) {
    case "BEST_OF":
      //if N solves are done, user with the most wins has won. Ties count.

      // prevent 0 points from being considered a max.
      const maxPoints = Math.max(...competingUsers.map((s) => s.points), 1);
      
      //this code assumes that the latest solve is the one we check for set winner on.
      if (room.currentSolve >= room.nSolves!) {
        return competingUsers
          .filter((roomUser) => roomUser.points == maxPoints)
          .map((roomUser) => {
            return roomUser.user.id;
          });
      }

      //if <N solves are done, user has won for sure if they have the majority of solves. will return empty list if no winners yet.
      if (maxPoints > room.nSolves! / 2) {
        return competingUsers
          .filter((roomUser) => roomUser.points > room.nSolves! / 2)
          .map((roomUser) => {
            return roomUser.user.id;
          });
      }
    case "FIRST_TO":
      //user has won only when they win n solves.
      return competingUsers
        .filter((roomUser) => roomUser.points >= room.nSolves!)
        .map((roomUser) => {
          return roomUser.user.id;
        });
    case "AVERAGE_OF": {
      //requires that competing user have done ALL solves in this set
      const setSolves = room.solves.filter(
        (roomSolve) => roomSolve.setIndex == room.currentSet
      );
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

      return eligibleIds.filter(
        (uid) => averages[uid] === minAverage && averages[uid] !== Infinity
      );
    }
    case "MEAN_OF": {
      //requires that competing user have done ALL solves in this set
      const setSolves = room.solves.filter(
        (roomSolve) => roomSolve.setIndex == room.currentSet
      );
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

      return eligibleIds.filter(
        (uid) => means[uid] === minMean && means[uid] !== Infinity
      );
    }
    default:
      return [];
  }
}

/**
 * Check if the match is finished.
 * This function should be run BEFORE finding match winners
 */
export function checkMatchFinished(room: IRoom): boolean {
  /**
   * Under current match formats:
   * Bo - either finish all sets, or someone has to take majority (> N / 2) of set wins available
   * Ft - someone has to get at least N set wins
   */
  if (room.solves.length === 0) return false;

  switch (room.matchFormat) {
    case "BEST_OF":
      const currentSolve = room.solves.at(-1)!;
      return (
        Object.values(room.users).filter(
          (roomUser) => roomUser.setWins > room.nSets! / 2
        ).length > 0 ||
        (currentSolve.setIndex === room.nSets && checkSetFinished(room))
      );
    case "FIRST_TO":
      return (
        Object.values(room.users).filter(
          (roomUser) => roomUser.setWins >= room.nSets!
        ).length > 0
      );
    default:
      return false;
  }
}

/**
 * check if there is a match winner. return all match winner(s), although it should be rare to have multiple.
 * This function sHould ONLY be called if the set is finished, and should be called AFTER updating set wins
 */
export function findMatchWinners(room: IRoom): string[] {
  //no set wins when room is a casual room
  if (room.roomFormat == "CASUAL" || room.solves.length === 0) return [];
  const roomUsers = Object.values(room.users);

  switch (room.matchFormat) {
    case "BEST_OF":
      //user has won for sure if they have the majority of sets
      const candidateMatchWinners = roomUsers
        .filter((roomUser) => roomUser.setWins > room.nSets! / 2)
        .map((roomUser) => {
          return roomUser.user.id;
        });
      if (candidateMatchWinners.length > 0) {
        return candidateMatchWinners;
      }

      // otherwise, it is possible to win w/o majority of sets. if the last set is done, need to check for max set wins of all users
      const currentSolve = room.solves.at(-1)!;
      if (currentSolve.setIndex === room.nSets! && currentSolve.finished) {
        /**
         * in AO/MO mode, set only finishes when all solves are done.
         * in BO/FT mode, set can finish before the last solve when a user takes the set. In this case, we rely on other functions not checking for match winners before the set is finished (either by set win or by number of solves)
         */
        if (
          ((room.setFormat === "AVERAGE_OF" || room.setFormat === "MEAN_OF") &&
            currentSolve.solveIndex === room.nSolves!) ||
          room.setFormat === "BEST_OF" ||
          room.setFormat === "FIRST_TO"
        ) {
          //scan over all users. note that this includes users who are no longer competing or active.
          let candidateWinners: string[] = [];
          let maxSetWins = 1; //this prevents users with 0 set wins from counting as winners

          for (const roomUser of Object.values(room.users)) {
            if (roomUser.setWins === maxSetWins) {
              candidateWinners.push(roomUser.user.id);
            } else if (roomUser.setWins > maxSetWins) {
              maxSetWins = roomUser.setWins;
              candidateWinners = [roomUser.user.id];
            }
          }

          return candidateWinners;
        }
      }
      return [];
    case "FIRST_TO":
      //user has won only when they win n sets.
      return roomUsers
        .filter((roomUser) => roomUser.setWins >= room.nSets!)
        .map((roomUser) => {
          return roomUser.user.id;
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
    (user) => user.competing && user.active
  );

  //if no competing users, don't consider this solve finished.
  if (competingUsers.length == 0) return false;

  let allUsersFinished: boolean = true;
  for (const roomUser of competingUsers) {
    if (
      roomUser.userStatus !== "FINISHED" ||
      !Object.hasOwn(currentSolve!.solve.results, roomUser.user.id)
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
    console.log(
      `finishRoomSolve: room ${room.id} has no currentSolve to finish`
    );
    return;
  }
  const currentResults = currentSolve.solve.results;

  if (room.setFormat == "BEST_OF" || room.setFormat == "FIRST_TO") {
    const eligibleResults: [string, IResult][] = Object.entries(currentResults);

    let fastest_uid = null;
    let fastest_result: Result | undefined = undefined;

    for (const [userId, iResult] of eligibleResults) {
      const result: Result = Result.fromIResult(iResult);
      if (
        result.getPenalty() !== "DNF" &&
        (!fastest_result || result.isLessThan(fastest_result))
      ) {
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
  } else if (room.setFormat === "AVERAGE_OF" || room.setFormat === "MEAN_OF") {
    /**
     * update points to reflect the current average/mean for each user.
     * the average is taken by removing best and worst solves and taking mean of the rest.
     * for now, any N <= 2 is a mean instead of an average
     *
     * we have to recalculate for active & competing users at each point.
     */
    const setResults = room.solves
      .filter((solve) => solve.setIndex === room.currentSet)
      .map((solve) => solve.solve.results);
    const eligibleUsers = Object.values(room.users).filter(
      (roomUser) => roomUser.active && roomUser.competing
    );
    for (const roomUser of eligibleUsers) {
      //recalculate mean over recent set solves
      const userResults = setResults.map((resultMap) =>
        Object.hasOwn(resultMap, roomUser.user.id)
          ? resultMap[roomUser.user.id]
          : new Result(0, "DNF").toIResult()
      );

      if (room.setFormat === "AVERAGE_OF") {
        room.users[roomUser.user.id].points = Result.iAverageOf(userResults);
      } else {
        room.users[roomUser.user.id].points = Result.iMeanOf(userResults);
      }
    }
  }

  // Mark solve as finished
  currentSolve.finished = true;

  //check set finished.
  const setFinished = checkSetFinished(room);
  if (setFinished) {
    // find set winners.
    const setWinners: string[] = findSetWinners(room);
    currentSolve.setWinners = setWinners;

    // update set wins for set winners
    setWinners.map((uid) => (room.users[uid].setWins += 1));

    // check match finished. right now a match can only be finished if the set is finished.
    const matchFinished = checkMatchFinished(room);
    if (matchFinished) {
      const matchWinners: string[] = findMatchWinners(room);
      if (matchWinners.length > 0) {
        //handle match win
        room.winners = matchWinners;
        room.state = "FINISHED";
        currentSolve.matchWinners = matchWinners;
      }
    }

    // reset all users' points
    Object.values(room.users).map((roomUser) => {
      roomUser.points = 0;
    });
    // reset solve counter, update set counter
    room.currentSolve = 0;
    room.currentSet += 1;
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
  };
  const newSolve: IRoomSolve = {
    solve: solveObj,
    setIndex: room.currentSet,
    solveIndex: room.currentSolve + 1,
    finished: false,
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

  for (const roomUser of Object.values(room.users)) {
    roomUser.points = 0;
    roomUser.setWins = 0;
    roomUser.userStatus = "IDLE";
    roomUser.currentResult = undefined;
  };
}

function getCurrentSolveId(room: IRoom) {
  if (room.solves.length == 0) return 0;
  return room.solves.at(-1)!.solve.id;
}
