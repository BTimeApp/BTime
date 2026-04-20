import type { IRoomTeam, IRoomUser } from "./room-participant.js";
import type { IRoomMatch } from "./room-solve.js";
import type { IUserInfo } from "./user.js";

import { literalKeys } from "./utils.js";

export interface RoomEventAttributes {
  displayName: string;
  baseEvent: string;
  jsName: string;
  iconSrc: string;
}

// These are currently updated to be used with cubing.js/twisty.
// export const ROOM_EVENT_JS_NAME_MAP = new Map<RoomEvent, string>([
//   ["333", "333"],
//   ["222", "222"],
//   ["444", "444"],
//   ["555", "555"],
//   ["666", "666"],
//   ["777", "777"],
//   ["megaminx", "minx"],
//   ["pyraminx", "pyram"],
//   ["skewb", "skewb"],
//   ["clock", "clock"],
//   ["sq1", "sq1"],
//   ["3oh", "333oh"],
//   ["3bld", "333bf"],
//   ["4bld", "444bf"],
//   ["5bld", "555bf"],
// ]);

// Source - https://icons.cubing.net/#svg
export const ROOM_EVENTS_INFO = {
  "333": {
    displayName: "3x3",
    baseEvent: "333",
    jsName: "3x3x3",
    iconSrc: "event-333",
  },
  "222": {
    displayName: "2x2",
    baseEvent: "222",
    jsName: "2x2x2",
    iconSrc: "event-222",
  },
  "444": {
    displayName: "4x4",
    baseEvent: "444",
    jsName: "4x4x4",
    iconSrc: "event-444",
  },
  "555": {
    displayName: "5x5",
    baseEvent: "555",
    jsName: "5x5x5",
    iconSrc: "event-555",
  },
  "666": {
    displayName: "6x6",
    baseEvent: "666",
    jsName: "6x6x6",
    iconSrc: "event-666",
  },
  "777": {
    displayName: "7x7",
    baseEvent: "777",
    jsName: "7x7x7",
    iconSrc: "event-777",
  },
  megaminx: {
    displayName: "Megaminx",
    baseEvent: "megaminx",
    jsName: "megaminx",
    iconSrc: "event-minx",
  },
  pyraminx: {
    displayName: "Pyraminx",
    baseEvent: "pyraminx",
    jsName: "pyraminx",
    iconSrc: "event-pyra",
  },
  skewb: {
    displayName: "Skewb",
    baseEvent: "skewb",
    jsName: "skewb",
    iconSrc: "event-skewb",
  },
  clock: {
    displayName: "Clock",
    baseEvent: "clock",
    jsName: "clock",
    iconSrc: "event-clock",
  },
  sq1: {
    displayName: "Sq-1",
    baseEvent: "sq1",
    jsName: "square1",
    iconSrc: "event-sq1",
  },
  "3oh": {
    displayName: "3x3 OH",
    baseEvent: "333",
    jsName: "3x3x3",
    iconSrc: "event-333oh",
  },
  "3bld": {
    displayName: "3BLD",
    baseEvent: "333",
    jsName: "3x3x3",
    iconSrc: "event-3bf",
  },
  "4bld": {
    displayName: "4BLD",
    baseEvent: "444",
    jsName: "4x4x4",
    iconSrc: "event-4bf",
  },
  "5bld": {
    displayName: "5BLD",
    baseEvent: "555",
    jsName: "5x5x5",
    iconSrc: "event-5bf",
  },
} satisfies Record<string, RoomEventAttributes>;
export const ROOM_EVENTS = literalKeys(ROOM_EVENTS_INFO);

export interface RoomFormatAttributes {
  teams: boolean; //whether teams is enabled in this format
  competitive: boolean; //whether this format is considered "competitive"
  requiredSettings?: string[]; //required room settings
  disabledSetFormats?: SetFormat[]; //any set formats that don't work with this format
  // overrides: Record<string, any>
}

export const ROOM_FORMATS = ["CASUAL", "RACING"] as const;

export const VISIBILITIES = ["PUBLIC", "PRIVATE"] as const;

//match formats - how to win a race based on number of sets won
export const MATCH_FORMATS = [
  "BEST_OF", //best of n sets wins
  "FIRST_TO", //first to n sets wins
] as const;

//set formats - how to win a set based on the solves
export const SET_FORMATS = [
  "BEST_OF", //best of n solves
  "FIRST_TO", //first to n solves
  "AVERAGE_OF", //average of n format (mean when dropping max and min) - n >= 3
  "MEAN_OF", //mean of n format
  "FASTEST_OF", //fastest of n solves - same as Best of in WCA competitions
  // in future, support other formats like total time differential
] as const;

//all room states
export const ROOM_STATES = [
  "WAITING", //like a pregame lobby - waiting for people before host starts
  "STARTED", //ingame - doing solves
  "FINISHED", //either when host ends the room, or when all attempts are done
] as const;

export const TEAM_SOLVE_FORMATS = [
  "ALL", //per solve, everyone in the team competes
  "ONE", //per solve, only one person in the team competes
] as const;

export const TEAM_SCRAMBLE_FORMATS = [
  "SAME", //(assuming multiple ppl per team compete per same solve) everyone gets same scramble
  "DIFFERENT", //... everyone gets diff scramble
] as const;

//how the reduction from multiple results per solve in a team goes to one result for evaluation
export const TEAM_REDUCE_FUNCTIONS = [
  "SUM", //sum of all teammates' times
  "MEAN", //mean of all teammates' times
  "MEDIAN", //median of all teammates' times
  "FASTEST", //fastest (min) of all teammates' times
] as const;

export type RoomEvent = (typeof ROOM_EVENTS)[number];
export type RoomFormat = (typeof ROOM_FORMATS)[number];
export type Visibility = (typeof VISIBILITIES)[number];
export type MatchFormat = (typeof MATCH_FORMATS)[number];
export type SetFormat = (typeof SET_FORMATS)[number];
export type RoomState = (typeof ROOM_STATES)[number];
export type TeamSolveFormat = (typeof TEAM_SOLVE_FORMATS)[number];
export type TeamScrambleFormat = (typeof TEAM_SCRAMBLE_FORMATS)[number];
export type TeamReduceFunction = (typeof TEAM_REDUCE_FUNCTIONS)[number];

export interface IRoom {
  id: string;
  host?: IUserInfo;
  users: Record<string, IRoomUser>; //objectId (user) : IRoomUser. The key has to be a string b/c of mongoDB storage.
  teams: Record<string, IRoomTeam>; //objectId (team) : IRoomTeam
  match: IRoomMatch;
  currentSet: number; //the current set number (1-indexed)
  currentSolve: number; //the solve number WITHIN the current set (1-indexed)
  state: RoomState;

  // solves: IRoomSolve[];
  // winners?: string[]; //the objectId(s) who have won the whole room

  settings: IRoomSettings;
}

export type Access =
  | {
      visibility: Extract<Visibility, "PUBLIC">;
    }
  | {
      visibility: Extract<Visibility, "PRIVATE">;
      password: string;
    };

export type RaceSettings =
  | {
      roomFormat: Extract<RoomFormat, "CASUAL">;
    }
  | {
      roomFormat: Extract<RoomFormat, "RACING">;
      matchFormat: MatchFormat;
      setFormat: SetFormat;
      nSets: number;
      nSolves: number;
    };

export type TeamFormatSettings =
  | { teamSolveFormat: Extract<TeamSolveFormat, "ONE"> }
  | {
      teamSolveFormat: Extract<TeamSolveFormat, "ALL">;
      teamScrambleFormat: TeamScrambleFormat;
      teamReduceFunction: TeamReduceFunction;
    };

export type TeamSettings =
  | {
      teamsEnabled: false;
    }
  | {
      teamsEnabled: true;
      teamFormatSettings: TeamFormatSettings;
      maxTeamCapacity?: number;
      maxNumTeams?: number;
    };

// settings used when creating a room
export interface IRoomSettings {
  roomName: string;
  roomEvent: RoomEvent;
  access: Access;
  raceSettings: RaceSettings;
  teamSettings: TeamSettings;
  maxUsers?: number; //the maximum number of users we can have in the room
  allowGuests?: boolean; //whether or not guests can join room
}

/**
 * Defines a room event that will be managed on the redis queue.
 * Needs to be JSON-serializable.
 */
export type RoomRedisEvent = {
  roomId: string; // although we don't need the roomId upon reading the event, we need it when writing to perform validation
  userId: string;
  socketId: string; // required for events where we need the exact socket connection (protect against users logged in on multiple tabs)
  event: string;
  args: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/**
 * Defines all possible reasons that a user could fail to join the room
 */
export enum USER_JOIN_FAILURE_REASON {
  WRONG_PASSWORD,
  UNDEFINED_PASSWORD,
  USER_BANNED,
  ROOM_FULL,
  GUESTS_NOT_ALLOWED,
}
