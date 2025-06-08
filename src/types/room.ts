import { IUser } from "@/types/user";
import { IRoomUser } from "@/types/roomUser";
import { ISolve } from "@/types/solve";
import { IRoomSolve } from "./roomSolve";
import { Result } from "./result";
import { generateScramble } from "@/lib/utils";

//defines all legal events
export const ROOM_EVENTS = [
  "333",
  "222",
  "444",
  "555",
  "666",
  "777",
  "megaminx",
  "pyraminx",
  "skewb",
  "clock",
  "sq1",
  "3oh",
  "3bld",
  "4bld",
  "5bld",
];

//defines all legal formats (more to come hopefully)
export const ROOM_FORMATS = [
  "CASUAL", //no points or score, just cubing
  "RACING", //racing with sets and points
  //TODO: add a competitive mode with ranking, etc
];

//match formats - how to win a race based on number of sets won
export const MATCH_FORMATS = [
  "BEST_OF", //best of n sets wins
  "FIRST_TO", //first to n sets wins
];

export const MATCH_FORMAT_MAP = new Map<MatchFormat, string>([
  ["BEST_OF", "Best of"],
  ["FIRST_TO", "First to"],
]);

//set formats - how to win a set based on the solves
export const SET_FORMATS = [
  "BEST_OF", //best of n solves
  "FIRST_TO", //first to n solves
  "AVERAGE_OF", //average of n format (mean when dropping max and min) - n >= 3
  "MEAN_OF", //mean of n format
  //TOdO - support other formats like total time differential
];

export const SET_FORMAT_MAP = new Map<SetFormat, string>([
  ["BEST_OF", "Best of"],
  ["FIRST_TO", "First to"],
  ["AVERAGE_OF", "Average of"],
  ["MEAN_OF", "Mean of"],
]);

export function getVerboseFormatText(
  roomFormat: RoomFormat,
  matchFormat: MatchFormat,
  setFormat: SetFormat,
  nSets: number,
  nSolves: number
): string {
  if (roomFormat == "CASUAL") {
    return "Enjoy endless solves in this casual room.";
  } else {
    let formatText = "";
    if (nSets && nSets > 1) {
      switch (matchFormat) {
        case "BEST_OF":
          formatText +=
            "Win the match by winning the most of " + nSets + " sets.";
          break;
        case "FIRST_TO":
          formatText +=
            "Win the match by being the first to win " + nSets + " sets.";
          break;
        default:
          break;
      }
      formatText += "\n";
      switch (setFormat) {
        case "BEST_OF":
          formatText +=
            "Win a set by winning the most of " +
            nSolves +
            ` solve${nSolves > 1 ? "s" : ""}.`;
          break;
        case "FIRST_TO":
          formatText +=
            "Win a set by being the first to win " +
            nSolves +
            ` solve${nSolves > 1 ? "s" : ""}.`;
          break;
        case "AVERAGE_OF":
          formatText +=
            "Win a set by having the best average of " +
            nSolves +
            " solves (best and worst times dropped).";
          break;
        case "MEAN_OF":
          formatText +=
            "Win a set by having the best mean of " +
            nSolves +
            ` solve${nSolves > 1 ? "s" : ""}.`;
          break;
      }
    } else {
      switch (setFormat) {
        case "BEST_OF":
          formatText +=
            "Win the match by winning the most of " +
            nSolves +
            ` solve${nSolves > 1 ? "s" : ""}.`;
          break;
        case "FIRST_TO":
          formatText +=
            "Win the match by being the first to win " +
            nSolves +
            ` solve${nSolves > 1 ? "s" : ""}.`;
          break;
        case "AVERAGE_OF":
          formatText +=
            "Win the match by having the best average of " +
            nSolves +
            " solves (best and worst times dropped).";
          break;
        case "MEAN_OF":
          formatText +=
            "Win the match by having the best mean of " +
            nSolves +
            ` solve${nSolves > 1 ? "s" : ""}.`;
          break;
      }
    }

    return formatText;
  }
}

//all room states
export const ROOM_STATES = [
  "WAITING", //like a pregame lobby - waiting for people before host starts
  "STARTED", //ingame - doing solves
  "FINSHED", //either when host ends the room, or when all attempts are done
];

export type RoomEvent = (typeof ROOM_EVENTS)[number];
export type RoomFormat = (typeof ROOM_FORMATS)[number];
export type MatchFormat = (typeof MATCH_FORMATS)[number];
export type SetFormat = (typeof SET_FORMATS)[number];
export type RoomState = (typeof ROOM_STATES)[number];

export interface IRoom {
  id: string;
  roomName: string;
  host: IUser;
  users: Record<string, IRoomUser>; //objectId (user) : IRoomUser. The key has to be a string b/c of mongoDB storage.
  solves: IRoomSolve[];
  currentSet: number; //the current set number (1-indexed)
  currentSolve: number; //the solve number WITHIN the current set (1-indexed)
  roomEvent: RoomEvent;
  roomFormat: RoomFormat;
  matchFormat?: MatchFormat; //how many sets to take to win
  setFormat?: SetFormat; //how to win a set
  nSets?: number; //number for match format
  nSolves?: number; //number for set format
  isPrivate: boolean;
  state: RoomState;
  password?: string;
  winners?: string[]; //the objectIds (users) who have won the whole room
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
        let competedIds = new Set(Object.keys(roomSolve.solve.results));
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
        let competedIds = new Set(Object.keys(roomSolve.solve.results));
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
  const competingUsers = Object.values(room.users).filter(
    (user) => user.competing
  );

  if (competingUsers.length == 0) {
    console.log(
      `Room ${room.id} has 0 competing users and cannot complete the current solve`
    );
    return;
  }

  if (room.setFormat == "BEST_OF" || room.setFormat == "FIRST_TO") {
    let fastest_uid = null;
    let fastest_result: Result | undefined = undefined;

    for (const roomUser of competingUsers) {
      const result: Result = Result.fromIResult(
        currentSolve!.solve.results[roomUser.user.id]
      );
      if (!fastest_result || result.isLessThan(fastest_result)) {
        //ties are broken by the first user to submit the time.
        fastest_uid = roomUser.user.id;
        fastest_result = result;
      }
    }

    // 0 users means return
    if (!fastest_uid || !fastest_result) {
      console.log(`Room ${room.id} has no winner for current solve. `);
      return;
    }
    room.users[fastest_uid].points += 1;
  }

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
    roomUser.userStatus = roomUser.competing ? "IDLE" : "SPECTATING";
    roomUser.currentResult = undefined;
  });
}

function getCurrentSolveId(room: IRoom) {
  if (room.solves.length == 0) return 0;
  return room.solves.at(-1)!.solve.id;
}
