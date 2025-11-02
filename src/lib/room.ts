import { IRoom, IRoomSettings } from "@/types/room";
import { ISolve } from "@/types/solve";
import { IRoomSolve } from "@/types/room-solve";
import { Result } from "@/types/result";
import { generateScramble } from "@/lib/utils";
import { ObjectId } from "bson";
import bcrypt from "bcrypt";
import { IUserInfo } from "@/types/user";
import { IRoomUser } from "@/types/room-participant";

export async function createRoom(
  roomSettings: IRoomSettings,
  roomId?: string,
  initialHost?: IUserInfo
): Promise<IRoom> {
  const room: IRoom = {
    id: roomId ? roomId : new ObjectId().toString(),
    users: {},
    teams: {},
    solves: [],
    currentSet: 1,
    currentSolve: 0,
    state: "WAITING",
    settings: roomSettings,
  };

  if (roomSettings.isPrivate) {
    room.settings.password = roomSettings.password
      ? await bcrypt.hash(roomSettings.password, 10)
      : ""; //never let a private room have an undefined password
  }
  room.host = initialHost;

  return room;
}

export async function updateRoom(
  room: IRoom,
  newRoomSettings: IRoomSettings
): Promise<void> {
  room.settings = newRoomSettings;

  if (newRoomSettings.isPrivate) {
    room.settings.password = newRoomSettings.password
      ? await bcrypt.hash(newRoomSettings.password, 10)
      : undefined;
  }
}

export function checkRoomUpdateRequireReset(
  room: IRoom,
  roomSettings: IRoomSettings
): boolean {
  let needsReset = true;
  if (
    room.settings.roomFormat === "CASUAL" &&
    roomSettings.roomFormat === "CASUAL" &&
    room.settings.roomEvent === roomSettings.roomEvent
  ) {
    // don't need to reset casual rooms
    needsReset = false;
  } else if (
    room.settings.roomFormat === roomSettings.roomFormat &&
    room.settings.matchFormat === roomSettings.matchFormat &&
    room.settings.setFormat === roomSettings.setFormat &&
    room.settings.roomEvent === roomSettings.roomEvent &&
    room.settings.nSets === roomSettings.nSets &&
    room.settings.nSolves === roomSettings.nSolves
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
  if (room.solves.length === 0 || room.settings.roomFormat !== "CASUAL")
    return false;
  const currentSolve = room.solves.at(-1)!;

  switch (room.settings.setFormat) {
    case "AVERAGE_OF":
      return (
        currentSolve.finished &&
        currentSolve.solveIndex === room.settings.nSolves &&
        currentSolve.setIndex === room.currentSet
      );
    case "MEAN_OF":
      return (
        currentSolve.finished &&
        currentSolve.solveIndex === room.settings.nSolves &&
        currentSolve.setIndex === room.currentSet
      );
    case "BEST_OF":
      return (
        Object.values(room.users).filter(
          (roomUser) => roomUser.points > room.settings.nSolves! / 2
        ).length > 0 ||
        (currentSolve.finished &&
          currentSolve.solveIndex === room.settings.nSolves &&
          currentSolve.setIndex === room.currentSet)
      );
    case "FIRST_TO":
      return (
        Object.values(room.users).filter(
          (roomUser) => roomUser.points >= room.settings.nSolves!
        ).length > 0
      );
    case "FASTEST_OF":
      return (
        currentSolve.finished &&
        currentSolve.solveIndex === room.settings.nSolves &&
        currentSolve.setIndex === room.currentSet
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
  if (room.settings.roomFormat == "CASUAL") return [];

  const roomUserIds = Object.keys(room.users);
  const roomUsers = Object.values(room.users);

  switch (room.settings.setFormat) {
    case "BEST_OF":
      //if N solves are done, user with the most wins has won. Ties count.

      // prevent 0 points from being considered a max.
      const maxPoints = Math.max(...roomUsers.map((s) => s.points), 1);

      //this code assumes that the latest solve is the one we check for set winner on.
      if (room.currentSolve >= room.settings.nSolves!) {
        return roomUsers
          .filter((roomUser) => roomUser.points == maxPoints)
          .map((roomUser) => {
            return roomUser.user.id;
          });
      }

      //if <N solves are done, user has won for sure if they have the majority of solves. will return empty list if no winners yet.
      if (maxPoints > room.settings.nSolves! / 2) {
        return roomUsers
          .filter((roomUser) => roomUser.points > room.settings.nSolves! / 2)
          .map((roomUser) => {
            return roomUser.user.id;
          });
      }
    case "FIRST_TO":
      //user has won only when they win n solves.
      return roomUsers
        .filter((roomUser) => roomUser.points >= room.settings.nSolves!)
        .map((roomUser) => {
          return roomUser.user.id;
        });
    case "AVERAGE_OF": {
      const setSolves = room.solves.filter(
        (roomSolve) => roomSolve.setIndex == room.currentSet
      );

      if (
        setSolves.length < (room.settings.nSolves || Number.POSITIVE_INFINITY)
      )
        return [];

      const userAverages: Record<string, number> = roomUserIds.reduce(
        (acc, id) => {
          acc[id] = Result.averageOf(
            setSolves.map((roomSolve) =>
              Object.keys(roomSolve.solve.results).includes(id)
                ? Result.fromIResult(roomSolve.solve.results[id])
                : new Result(0, "DNF")
            )
          );
          return acc;
        },
        {} as Record<string, number>
      );

      // return all fastest users
      const fastestAvg = Math.min(...Object.values(userAverages));
      // prevent DNF from being considered a min
      if (fastestAvg === Infinity) return []; //DNF was best

      return roomUserIds.filter(
        (roomUser) => userAverages[roomUser] == fastestAvg
      );
    }
    case "MEAN_OF": {
      //requires that competing user have done ALL solves in this set
      const setSolves = room.solves.filter(
        (roomSolve) => roomSolve.setIndex == room.currentSet
      );

      if (
        setSolves.length < (room.settings.nSolves || Number.POSITIVE_INFINITY)
      )
        return [];

      const userMeans: Record<string, number> = roomUserIds.reduce(
        (acc, id) => {
          acc[id] = Result.meanOf(
            setSolves.map((roomSolve) =>
              Object.keys(roomSolve.solve.results).includes(id)
                ? Result.fromIResult(roomSolve.solve.results[id])
                : new Result(0, "DNF")
            )
          );
          return acc;
        },
        {} as Record<string, number>
      );

      // return all fastest users
      const fastestMean = Math.min(...Object.values(userMeans));
      // prevent DNF from being considered a min
      if (fastestMean === Infinity) return []; //DNF was best

      return roomUserIds.filter(
        (roomUser) => userMeans[roomUser] == fastestMean
      );
    }
    case "FASTEST_OF": {
      const setSolves = room.solves.filter(
        (roomSolve) => roomSolve.setIndex == room.currentSet
      );

      if (
        setSolves.length < (room.settings.nSolves || Number.POSITIVE_INFINITY)
      )
        return [];

      const userMinTimes: Record<string, number> = roomUserIds.reduce(
        (acc, id) => {
          acc[id] = Result.minOf(
            setSolves.map((roomSolve) =>
              Object.keys(roomSolve.solve.results).includes(id)
                ? Result.fromIResult(roomSolve.solve.results[id])
                : new Result(0, "DNF")
            )
          );
          return acc;
        },
        {} as Record<string, number>
      );

      // return all fastest users
      const fastestTime = Math.min(...Object.values(userMinTimes));
      // prevent DNF from being considered a min
      if (fastestTime === Infinity) return []; //DNF was best

      return roomUserIds.filter(
        (roomUser) => userMinTimes[roomUser] == fastestTime
      );
    }
    default:
      throw Error(
        `Unimplemented setFormat for findSetWinners: ${room.settings.setFormat}`
      );
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

  switch (room.settings.matchFormat) {
    case "BEST_OF":
      const currentSolve = room.solves.at(-1)!;
      return (
        Object.values(room.users).filter(
          (roomUser) => roomUser.setWins > room.settings.nSets! / 2
        ).length > 0 ||
        (currentSolve.setIndex === room.settings.nSets &&
          checkSetFinished(room))
      );
    case "FIRST_TO":
      return (
        Object.values(room.users).filter(
          (roomUser) => roomUser.setWins >= room.settings.nSets!
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
  if (room.settings.roomFormat == "CASUAL" || room.solves.length === 0)
    return [];
  const roomUsers = Object.values(room.users);

  switch (room.settings.matchFormat) {
    case "BEST_OF":
      //user has won for sure if they have the majority of sets
      const candidateMatchWinners = roomUsers
        .filter((roomUser) => roomUser.setWins > room.settings.nSets! / 2)
        .map((roomUser) => {
          return roomUser.user.id;
        });
      if (candidateMatchWinners.length > 0) {
        return candidateMatchWinners;
      }

      // otherwise, it is possible to win w/o majority of sets. if the last set is done, need to check for max set wins of all users
      const currentSolve = room.solves.at(-1)!;
      if (
        currentSolve.setIndex === room.settings.nSets! &&
        currentSolve.finished
      ) {
        /**
         * in AO/MO/FO mode, set only finishes when all solves are done.
         * in BO/FT mode, set can finish before the last solve when a user takes the set. In this case, we rely on other functions not checking for match winners before the set is finished (either by set win or by number of solves)
         */
        if (
          ((room.settings.setFormat === "AVERAGE_OF" ||
            room.settings.setFormat === "MEAN_OF" ||
            room.settings.setFormat === "FASTEST_OF") &&
            currentSolve.solveIndex === room.settings.nSolves!) ||
          room.settings.setFormat === "BEST_OF" ||
          room.settings.setFormat === "FIRST_TO"
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
        .filter((roomUser) => roomUser.setWins >= room.settings.nSets!)
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
  const currentSolve = room.solves.at(-1)!;
  const competingUsers = Object.values(room.users).filter(
    (user) => user.competing && user.active
  );

  if (room.settings.teamSettings.teamsEnabled) {
    //TODO - implement team modes
    return false;
  } else {
    if (competingUsers.length == 0) return false;
  
    let allUsersFinished: boolean = true;
    for (const roomUser of competingUsers) {
      if (
        roomUser.solveStatus !== "FINISHED" ||
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
}

/**
 *  Find the winner of the current solve. Award a point and process necessary consequences (set win, race win)
 */
export function finishRoomSolve(room: IRoom) {
  if (room.solves.length == 0) return;

  const currentSolve = room.solves.at(-1);
  if (!currentSolve) {
    throw Error(
      `finishRoomSolve: room ${room.id} has no currentSolve to finish`
    );
  }
  const currentResults = currentSolve.solve.results;

  if (
    room.settings.setFormat === "BEST_OF" ||
    room.settings.setFormat === "FIRST_TO" ||
    room.settings.roomFormat === "CASUAL"
  ) {
    let currFastestResult: Result = new Result(0, "DNF");
    let solveWinners: string[] = [];

    for (const [uid, iResult] of Object.entries(currentResults)) {
      const result = Result.fromIResult(iResult);
      if (iResult.penalty !== "DNF") {
        if (result.isLessThan(currFastestResult)) {
          solveWinners = [];
          solveWinners.push(uid);
          currFastestResult = result;
        } else if (
          result.equals(currFastestResult) &&
          iResult.penalty !== "DNF"
        ) {
          solveWinners.push(uid);
        }
      }
    }

    currentSolve.solveWinners = solveWinners;
    for (const uid of solveWinners) {
      room.users[uid].points += 1;
    }
  } else if (
    room.settings.setFormat === "AVERAGE_OF" ||
    room.settings.setFormat === "MEAN_OF" ||
    room.settings.setFormat === "FASTEST_OF"
  ) {
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
    for (const roomUser of Object.values(room.users)) {
      //recalculate mean over recent set solves
      const userResults = setResults.map((resultMap) =>
        Object.hasOwn(resultMap, roomUser.user.id)
          ? resultMap[roomUser.user.id]
          : new Result(0, "DNF").toIResult()
      );

      if (room.settings.setFormat === "AVERAGE_OF") {
        room.users[roomUser.user.id].points = Result.iAverageOf(userResults);
      } else if (room.settings.setFormat === "MEAN_OF") {
        room.users[roomUser.user.id].points = Result.iMeanOf(userResults);
      } else if (room.settings.setFormat === "FASTEST_OF") {
        // fastest of
        room.users[roomUser.user.id].points = Result.iMinOf(userResults);
      }
    }
  }

  // Mark solve as finished
  currentSolve.finished = true;
}

/** Generates a new solve for a room and its users. Does not update wins or points
 *
 *
 */
export async function newRoomSolve(room: IRoom) {
  //get current solve Id. Consider storing a currentSolveId field in the room to not need to do this
  const currSolveId = getCurrentSolveId(room);

  const newScramble: string = await generateScramble(room.settings.roomEvent);
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

  return newSolve;
}

/**
 * Resets the current solve to generate a new scramble
 */
export async function newScramble(room: IRoom) {
  if (room.solves.length == 0) return;

  room.solves.at(-1)!.solve.scramble = await generateScramble(
    room.settings.roomEvent
  );
  room.solves.at(-1)!.solve.results = {};

  for (const roomUser of Object.values(room.users)) {
    roomUser.currentResult = undefined;
    roomUser.solveStatus = "IDLE";
  }
}

/**
 * Resets the room
 */
export function resetRoom(room: IRoom) {
  room.state = "WAITING";
  room.solves = [];
  room.currentSet = 1;
  room.currentSolve = 0;
  room.winners = room.settings.roomFormat != "CASUAL" ? [] : undefined;

  for (const roomUser of Object.values(room.users)) {
    roomUser.points = 0;
    roomUser.setWins = 0;
    roomUser.solveStatus = "IDLE";
    roomUser.currentResult = undefined;
  }
}

function getCurrentSolveId(room: IRoom) {
  if (room.solves.length == 0) return 0;
  return room.solves.at(-1)!.solve.id;
}
