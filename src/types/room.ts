import { IUser } from "@/types/user";
import { IRoomUser } from "@/types/room-user";
import { IRoomSolve } from "@/types/room-solve";

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
] as const;

export const ROOM_EVENT_DISPLAY_NAME_MAP = new Map<RoomEvent, string>([
  ["333", "3x3"],
  ["222", "2x2"],
  ["444", "4x4"],
  ["555", "5x5"],
  ["666", "6x6"],
  ["777", "7x7"],
  ["megaminx", "Megaminx"],
  ["pyraminx", "Pyraminx"],
  ["skewb", "Skewb"],
  ["clock", "Clock"],
  ["sq1", "Sq-1"],
  ["3oh", "3x3 OH"],
  ["3bld", "3BLD"],
  ["4bld", "4BLD"],
  ["5bld", "5BLD"],
]);

// Source - https://icons.cubing.net/#svg
export const ROOM_EVENT_ICON_SRC_MAP = new Map<RoomEvent, string>([
  ["333", "event-333"],
  ["222", "event-222"],
  ["444", "event-444"],
  ["555", "event-555"],
  ["666", "event-666"],
  ["777", "event-777"],
  ["megaminx", "event-minx"],
  ["pyraminx", "event-pyram"],
  ["skewb", "event-skewb"],
  ["clock", "event-clock"],
  ["sq1", "event-sq1"],
  ["3oh", "event-333oh"],
  ["3bld", "event-333bf"],
  ["4bld", "event-444bf"],
  ["5bld", "event-555bf"],
]);

// These are currently updated to be used with cubing.js/twisty. The scramble-display names are the event names above without "event-".
export const ROOM_EVENT_JS_NAME_MAP = new Map<RoomEvent, string>([
  ["333", "3x3x3"],
  ["222", "2x2x2"],
  ["444", "4x4x4"],
  ["555", "5x5x5"],
  ["666", "6x6x6"],
  ["777", "7x7x7"],
  ["megaminx", "megaminx"],
  ["pyraminx", "pyraminx"],
  ["skewb", "skewb"],
  ["clock", "clock"],
  ["sq1", "square1"],
  ["3oh", "3x3x3"],
  ["3bld", "3x3x3"],
  ["4bld", "4x4x4"],
  ["5bld", "5x5x5"],
]);

//defines all legal formats (more to come hopefully)
export const ROOM_FORMATS = [
  "CASUAL", //no points or score, just cubing
  "RACING", //racing with sets and points
  //TODO: add a competitive mode with ranking, etc
] as const;

//match formats - how to win a race based on number of sets won
export const MATCH_FORMATS = [
  "BEST_OF", //best of n sets wins
  "FIRST_TO", //first to n sets wins
] as const;

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
] as const;

export const SET_FORMAT_MAP = new Map<SetFormat, string>([
  ["BEST_OF", "Best of"],
  ["FIRST_TO", "First to"],
  ["AVERAGE_OF", "Average of"],
  ["MEAN_OF", "Mean of"],
]);

export const MATCH_FORMAT_ABBREVIATION_MAP = new Map<MatchFormat, string>([
  ["BEST_OF", "bo"],
  ["FIRST_TO", "ft"],
]);

export const SET_FORMAT_ABBREVIATION_MAP = new Map<SetFormat, string>([
  ["BEST_OF", "bo"],
  ["FIRST_TO", "ft"],
  ["AVERAGE_OF", "ao"],
  ["MEAN_OF", "mo"],
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
  "FINISHED", //either when host ends the room, or when all attempts are done
] as const;

export type RoomEvent = (typeof ROOM_EVENTS)[number];
export type RoomFormat = (typeof ROOM_FORMATS)[number];
export type MatchFormat = (typeof MATCH_FORMATS)[number];
export type SetFormat = (typeof SET_FORMATS)[number];
export type RoomState = (typeof ROOM_STATES)[number];

export interface IRoom {
  id: string;
  roomName: string;
  host?: IUser; //in the future, may have rooms automatically generated by backend (e.g. ranked rooms) that don't need hosts
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

// settings used when creating a room
export interface IRoomSettings {
  roomName: string;
  host?: IUser;
  roomEvent: RoomEvent;
  roomFormat: RoomFormat;
  matchFormat?: MatchFormat;
  setFormat?: SetFormat;
  isPrivate: boolean;
  password?: string;
  nSets?: number;
  nSolves?: number;
}
