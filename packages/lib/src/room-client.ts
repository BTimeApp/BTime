import type { RaceSettings, TeamSettings } from "@btime/types";

import { displayText } from "./utils.js";

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
        case "BEST_OF": {
          lines.push(
            "Win the match by winning the most of " +
              raceSettings.nSets +
              " sets."
          );
          break;
        }
        case "FIRST_TO": {
          lines.push(
            "Win the match by being the first to win " +
              raceSettings.nSets +
              " sets."
          );
          break;
        }
        default: {
          const illegalMatchFormat: never = raceSettings.matchFormat;
          console.warn(`Illegal set format: ${illegalMatchFormat}`);
          break;
        }
      }

      switch (raceSettings.setFormat) {
        case "BEST_OF": {
          lines.push(
            "Win a set by winning the most of " +
              raceSettings.nSolves +
              ` solve${raceSettings.nSolves > 1 ? "s" : ""}.`
          );
          break;
        }
        case "FIRST_TO": {
          lines.push(
            "Win a set by being the first to win " +
              raceSettings.nSolves +
              ` solve${raceSettings.nSolves > 1 ? "s" : ""}.`
          );
          break;
        }
        case "AVERAGE_OF": {
          lines.push(
            "Win a set by having the best average of " +
              raceSettings.nSolves +
              " solves (best and worst times dropped)."
          );
          break;
        }
        case "MEAN_OF": {
          lines.push(
            "Win a set by having the best mean of " +
              raceSettings.nSolves +
              ` solve${raceSettings.nSolves > 1 ? "s" : ""}.`
          );
          break;
        }
        case "FASTEST_OF": {
          lines.push(
            "Win a set by having the best single of " +
              raceSettings.nSolves +
              ` solve${raceSettings.nSolves > 1 ? "s" : ""}.`
          );
          break;
        }
        default: {
          const illegalSetFormat: never = raceSettings.setFormat;
          console.warn(`Illegal set format: ${illegalSetFormat}`);
          break;
        }
      }
    } else {
      switch (raceSettings.setFormat) {
        case "BEST_OF": {
          lines.push(
            "Win the match by winning the most of " +
              raceSettings.nSolves +
              ` solve${raceSettings.nSolves > 1 ? "s" : ""}.`
          );
          break;
        }
        case "FIRST_TO": {
          lines.push(
            "Win the match by being the first to win " +
              raceSettings.nSolves +
              ` solve${raceSettings.nSolves > 1 ? "s" : ""}.`
          );
          break;
        }
        case "AVERAGE_OF": {
          lines.push(
            "Win the match by having the best average of " +
              raceSettings.nSolves +
              " solves (best and worst times dropped)."
          );
          break;
        }
        case "MEAN_OF": {
          lines.push(
            "Win the match by having the best mean of " +
              raceSettings.nSolves +
              ` solve${raceSettings.nSolves > 1 ? "s" : ""}.`
          );
          break;
        }
        case "FASTEST_OF": {
          lines.push(
            "Win the match by having the best single of " +
              raceSettings.nSolves +
              ` solve${raceSettings.nSolves > 1 ? "s" : ""}.`
          );
          break;
        }
        default: {
          const illegalSetFormat: never = raceSettings.setFormat;
          console.warn(`Illegal set format: ${illegalSetFormat}`);
          break;
        }
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
      case "ONE": {
        lines.push("Each team member will take turns completing solves.");
        lines.push(
          "The current member's result will count for the whole team."
        );
        break;
      }
      case "ALL": {
        lines.push("All team members will submit attempt for each solve.");

        switch (teamSettings.teamFormatSettings.teamReduceFunction) {
          case "FASTEST": {
            lines.push("The team's result is the fastest individual result.");
            break;
          }
          case "MEAN": {
            lines.push(
              "The team's result is the mean of all individual results."
            );
            break;
          }
          case "MEDIAN": {
            lines.push(
              "The team's result is the median of all individual results."
            );
            break;
          }
          case "SUM": {
            lines.push(
              "The team's result is the sum of all individual results."
            );
            break;
          }
          default: {
            const illegalTeamReduceFunction: never =
              teamSettings.teamFormatSettings.teamReduceFunction;
            console.warn(
              `Illegal team scramble format ${illegalTeamReduceFunction}`
            );
            break;
          }
        }

        switch (teamSettings.teamFormatSettings.teamScrambleFormat) {
          case "SAME": {
            lines.push("Everyone will receive the same scrambles.");
            break;
          }
          case "DIFFERENT": {
            lines.push("Every team member will receive different scrambles.");
            break;
          }
          default: {
            const badValue: never =
              teamSettings.teamFormatSettings.teamScrambleFormat;
            console.warn(`Illegal team scramble format ${badValue}`);
            break;
          }
        }
        break;
      }
      default: {
        const illegalTeamSolveFormat: never = teamSolveFormat;
        console.warn(`Illegal team scramble format ${illegalTeamSolveFormat}`);
        break;
      }
    }
  }

  return lines;
}
