import { IUserInfo } from "@/types/user";
import { IRoomTeam, IRoomUser } from "@/types/room-participant";
import { IRoomSolve } from "@/types/room-solve";
import { displayText, literalKeys } from "@/lib/utils";

export interface RoomEventAttributes {
  displayName: string;
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
    jsName: "3x3x3",
    iconSrc: "event-333",
  },
  "222": {
    displayName: "2x2",
    jsName: "2x2x2",
    iconSrc: "event-222",
  },
  "444": {
    displayName: "4x4",
    jsName: "4x4x4",
    iconSrc: "event-444",
  },
  "555": {
    displayName: "5x5",
    jsName: "5x5x5",
    iconSrc: "event-555",
  },
  "666": {
    displayName: "6x6",
    jsName: "6x6x6",
    iconSrc: "event-666",
  },
  "777": {
    displayName: "7x7",
    jsName: "7x7x7",
    iconSrc: "event-777",
  },
  megaminx: {
    displayName: "Megaminx",
    jsName: "megaminx",
    iconSrc: "event-minx",
  },
  pyraminx: {
    displayName: "Pyraminx",
    jsName: "pyraminx",
    iconSrc: "event-pyra",
  },
  skewb: {
    displayName: "Skewb",
    jsName: "skewb",
    iconSrc: "event-skewb",
  },
  clock: {
    displayName: "Clock",
    jsName: "clock",
    iconSrc: "event-clock",
  },
  sq1: {
    displayName: "Sq-1",
    jsName: "square1",
    iconSrc: "event-sq1",
  },
  "3oh": {
    displayName: "3x3 OH",
    jsName: "3x3x3",
    iconSrc: "event-333oh",
  },
  "3bld": {
    displayName: "3BLD",
    jsName: "3x3x3",
    iconSrc: "event-3bf",
  },
  "4bld": {
    displayName: "4BLD",
    jsName: "4x4x4",
    iconSrc: "event-4bf",
  },
  "5bld": {
    displayName: "5BLD",
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
  //TOdO - support other formats like total time differential
] as const;

export function getRaceFormatText(raceSettings: RaceSettings): string {
  const formatText = [];
  if (raceSettings.roomFormat === "CASUAL") {
    formatText.push("Casual");
  } else {
    if (raceSettings.nSets > 1) {
      formatText.push(
        displayText(raceSettings.matchFormat) +
          " " +
          raceSettings.nSets +
          " set" +
          (raceSettings.nSets > 1 ? "s" : "")
      );
    }

    formatText.push(
      displayText(raceSettings.setFormat) +
        " " +
        raceSettings.nSolves +
        " solve" +
        (raceSettings.nSolves > 1 ? "s" : "")
    );
  }

  return "Format: " + formatText.join(", ");
}

export function getTeamFormatText(teamSettings: TeamSettings): string {
  return teamSettings.teamsEnabled
    ? `Team Format: ${displayText(
        teamSettings.teamFormatSettings.teamSolveFormat
      )}${
        teamSettings.teamFormatSettings.teamSolveFormat === "ALL"
          ? ` (${displayText(
              teamSettings.teamFormatSettings.teamScrambleFormat
            )} scrams, ${displayText(
              teamSettings.teamFormatSettings.teamReduceFunction
            )} of team)`
          : ""
      }`
    : "";
}

export function getVerboseRaceFormatTextLines(
  raceSettings: RaceSettings
): string[] {
  const lines: string[] = [];
  if (raceSettings.roomFormat == "CASUAL") {
    lines.push("Enjoy endless solves in this casual room.");
  } else {
    if (raceSettings.nSets && raceSettings.nSets > 1) {
      switch (raceSettings.matchFormat) {
        case "BEST_OF":
          lines.push(
            "Win the match by winning the most of " +
              raceSettings.nSets +
              " sets."
          );
          break;
        case "FIRST_TO":
          lines.push(
            "Win the match by being the first to win " +
              raceSettings.nSets +
              " sets."
          );
          break;
        default:
          const illegalMatchFormat: never = raceSettings.matchFormat;
          console.warn(`Illegal set format: ${illegalMatchFormat}`);
          break;
      }

      switch (raceSettings.setFormat) {
        case "BEST_OF":
          lines.push(
            "Win a set by winning the most of " +
              raceSettings.nSolves +
              ` solve${raceSettings.nSolves > 1 ? "s" : ""}.`
          );
          break;
        case "FIRST_TO":
          lines.push(
            "Win a set by being the first to win " +
              raceSettings.nSolves +
              ` solve${raceSettings.nSolves > 1 ? "s" : ""}.`
          );
          break;
        case "AVERAGE_OF":
          lines.push(
            "Win a set by having the best average of " +
              raceSettings.nSolves +
              " solves (best and worst times dropped)."
          );
          break;
        case "MEAN_OF":
          lines.push(
            "Win a set by having the best mean of " +
              raceSettings.nSolves +
              ` solve${raceSettings.nSolves > 1 ? "s" : ""}.`
          );
          break;
        case "FASTEST_OF":
          lines.push(
            "Win a set by having the best single of " +
              raceSettings.nSolves +
              ` solve${raceSettings.nSolves > 1 ? "s" : ""}.`
          );
          break;
        default:
          const illegalSetFormat: never = raceSettings.setFormat;
          console.warn(`Illegal set format: ${illegalSetFormat}`);
          break;
      }
    } else {
      switch (raceSettings.setFormat) {
        case "BEST_OF":
          lines.push(
            "Win the match by winning the most of " +
              raceSettings.nSolves +
              ` solve${raceSettings.nSolves > 1 ? "s" : ""}.`
          );
          break;
        case "FIRST_TO":
          lines.push(
            "Win the match by being the first to win " +
              raceSettings.nSolves +
              ` solve${raceSettings.nSolves > 1 ? "s" : ""}.`
          );
          break;
        case "AVERAGE_OF":
          lines.push(
            "Win the match by having the best average of " +
              raceSettings.nSolves +
              " solves (best and worst times dropped)."
          );
          break;
        case "MEAN_OF":
          lines.push(
            "Win the match by having the best mean of " +
              raceSettings.nSolves +
              ` solve${raceSettings.nSolves > 1 ? "s" : ""}.`
          );
          break;
        case "FASTEST_OF":
          lines.push(
            "Win the match by having the best single of " +
              raceSettings.nSolves +
              ` solve${raceSettings.nSolves > 1 ? "s" : ""}.`
          );
          break;
        default:
          const illegalSetFormat: never = raceSettings.setFormat;
          console.warn(`Illegal set format: ${illegalSetFormat}`);
          break;
      }
    }
  }
  return lines;
}

export function getVerboseTeamFormatTextLines(
  teamSettings: TeamSettings
): string[] {
  const lines: string[] = [];

  if (teamSettings.teamsEnabled) {
    const teamSolveFormat = teamSettings.teamFormatSettings.teamSolveFormat;
    switch (teamSolveFormat) {
      case "ONE":
        lines.push("Each team member will take turns completing solves.");
        lines.push(
          "The current member's result will count for the whole team."
        );
        break;
      case "ALL":
        lines.push("All team members will submit attempt for each solve.");

        switch (teamSettings.teamFormatSettings.teamReduceFunction) {
          case "FASTEST":
            lines.push("The team's result is the fastest individual result.")
            break;
          case "MEAN":
            lines.push("The team's result is the mean of all individual results.")
            break;
          case "MEDIAN":
            lines.push("The team's result is the median of all individual results.")
            break;
          case "SUM":
            lines.push("The team's result is the sum of all individual results.")
            break;
          default:
            const illegalTeamReduceFunction: never =
              teamSettings.teamFormatSettings.teamReduceFunction;
            console.warn(
              `Illegal team scramble format ${illegalTeamReduceFunction}`
            );
            break;
        }

        switch (teamSettings.teamFormatSettings.teamScrambleFormat) {
          case "SAME":
            lines.push("Everyone will receive the same scrambles.")
            break;
          case "DIFFERENT":
            lines.push("Every team member will receive different scrambles.")
            break;
          default:
            const badValue: never =
              teamSettings.teamFormatSettings.teamScrambleFormat;
            console.warn(`Illegal team scramble format ${badValue}`);
            break;
        }
        break;
      default:
        const illegalTeamSolveFormat: never = teamSolveFormat;
        console.warn(`Illegal team scramble format ${illegalTeamSolveFormat}`);
        break;
    }
  }

  return lines;
}

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
  solves: IRoomSolve[];
  currentSet: number; //the current set number (1-indexed)
  currentSolve: number; //the solve number WITHIN the current set (1-indexed)
  state: RoomState;
  winners?: string[]; //the objectId(s) who have won the whole room

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
}
