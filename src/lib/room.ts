import { Access, IRoom, IRoomSettings, TeamReduceFunction } from "@/types/room";
import { IAttempt, ISolve } from "@/types/solve";
import { IRoomSet, IRoomSolve } from "@/types/room-solve";
import { DNF, IResult, Result } from "@/types/result";
import { generateScramble, generateScrambles } from "@/lib/utils";
import { ObjectId } from "bson";
import bcrypt from "bcrypt";
import { IUserInfo } from "@/types/user";
import { IRoomTeam, IRoomUser } from "@/types/room-participant";
import { SocketResponse } from "@/types/socket_protocol";

export async function createRoom(
  roomSettings: IRoomSettings,
  roomId?: string,
  initialHost?: IUserInfo
): Promise<IRoom> {
  const room: IRoom = {
    id: roomId ? roomId : new ObjectId().toString(),
    users: {},
    teams: {},
    match: {
      sets: [],
      winners: [],
      finished: false,
    },
    currentSet: 0,
    currentSolve: 0,
    state: "WAITING",
    settings: roomSettings,
  };

  if (roomSettings.access.visibility == "PRIVATE") {
    const access: Access = { visibility: "PRIVATE", password: "" };
    access.password = roomSettings.access.password
      ? await bcrypt.hash(roomSettings.access.password, 10)
      : "";
    room.settings.access = access;
  }
  room.host = initialHost;

  return room;
}

export async function updateRoom(
  room: IRoom,
  newRoomSettings: IRoomSettings
): Promise<void> {
  room.settings = newRoomSettings;

  if (newRoomSettings.access.visibility == "PRIVATE") {
    const access: Access = { visibility: "PRIVATE", password: "" };
    access.password = newRoomSettings.access.password
      ? await bcrypt.hash(newRoomSettings.access.password, 10)
      : "";
    room.settings.access = access;
  }
}

export function getLatestSet(room: IRoom): IRoomSet | undefined {
  if (room.match.sets.length === 0) return;

  return room.match.sets.at(-1);
}

export function getLatestSolve(room: IRoom): IRoomSolve | undefined {
  const latestSet = getLatestSet(room);
  if (latestSet === undefined || latestSet.solves.length === 0) return;

  return latestSet.solves.at(-1);
}

export function checkRoomUpdateRequireReset(
  room: IRoom,
  roomSettings: IRoomSettings
): boolean {
  let needsReset = true;
  if (
    room.settings.raceSettings === roomSettings.raceSettings &&
    room.settings.teamSettings === roomSettings.teamSettings &&
    room.settings.roomEvent === roomSettings.roomEvent
  ) {
    // only need reset if
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

  const roomParticipants = room.settings.teamSettings.teamsEnabled
    ? Object.values(room.teams)
    : Object.values(room.users);

  const currentSolve = getLatestSolve(room);

  if (!currentSolve || room.settings.raceSettings.roomFormat === "CASUAL") {
    return false;
  }

  const nSolves = room.settings.raceSettings.nSolves;

  switch (room.settings.raceSettings.setFormat) {
    case "AVERAGE_OF":
      return currentSolve.finished && currentSolve.index === nSolves;
    case "MEAN_OF":
      return currentSolve.finished && currentSolve.index === nSolves;
    case "BEST_OF":
      return (
        roomParticipants.filter(
          (participant) => participant.points > nSolves / 2
        ).length > 0 ||
        (currentSolve.finished && currentSolve.index === nSolves)
      );
    case "FIRST_TO":
      return (
        roomParticipants.filter((participant) => participant.points >= nSolves)
          .length > 0
      );
    case "FASTEST_OF":
      return currentSolve.finished && currentSolve.index === nSolves;
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
  if (room.settings.raceSettings.roomFormat === "CASUAL") return [];

  const roomParticipants = room.settings.teamSettings.teamsEnabled
    ? room.teams
    : room.users;
  const nSolves = room.settings.raceSettings.nSolves;
  const currentSet = getLatestSet(room);
  if (!currentSet) return [];

  switch (room.settings.raceSettings.setFormat) {
    case "BEST_OF":
      //if N solves are done, user with the most wins has won. Ties count.

      // prevent 0 points from being considered a max.
      const maxPoints = Math.max(
        ...Object.values(roomParticipants).map((p) => p.points),
        1
      );

      //this code assumes that the latest solve is the one we check for set winner on.
      if (room.currentSolve >= nSolves) {
        return Object.keys(roomParticipants).filter(
          (participantId) =>
            roomParticipants[participantId].points === maxPoints
        );
      }

      //if <N solves are done, user has won for sure if they have the majority of solves. will return empty list if no winners yet.
      if (maxPoints > nSolves / 2) {
        return Object.keys(roomParticipants).filter(
          (participantId) =>
            roomParticipants[participantId].points > nSolves / 2
        );
      }
    case "FIRST_TO":
      //user has won only when they win n solves.
      return Object.keys(roomParticipants).filter(
        (participantId) => roomParticipants[participantId].points >= nSolves
      );
    case "AVERAGE_OF": {
      const setSolves = currentSet.solves;

      if (setSolves.length < nSolves) return [];

      const userAverages: Record<string, number> = Object.keys(
        roomParticipants
      ).reduce((acc, id) => {
        acc[id] = Result.averageOf(
          setSolves.map((roomSolve) =>
            Object.keys(roomSolve.solve.results).includes(id)
              ? Result.fromIResult(roomSolve.solve.results[id])
              : new Result(0, "DNF")
          )
        );
        return acc;
      }, {} as Record<string, number>);

      // return all fastest users
      const fastestAvg = Math.min(...Object.values(userAverages));
      // prevent DNF from being considered a min
      if (fastestAvg >= DNF) return []; //DNF was best

      return Object.keys(roomParticipants).filter(
        (participant) => userAverages[participant] == fastestAvg
      );
    }
    case "MEAN_OF": {
      //requires that competing user have done ALL solves in this set
      const setSolves = currentSet.solves;

      if (setSolves.length < (nSolves || Number.POSITIVE_INFINITY)) return [];

      const userMeans: Record<string, number> = Object.keys(
        roomParticipants
      ).reduce((acc, id) => {
        acc[id] = Result.meanOf(
          setSolves.map((roomSolve) =>
            Object.keys(roomSolve.solve.results).includes(id)
              ? Result.fromIResult(roomSolve.solve.results[id])
              : new Result(0, "DNF")
          )
        );
        return acc;
      }, {} as Record<string, number>);

      // return all fastest users
      const fastestMean = Math.min(...Object.values(userMeans));
      // prevent DNF from being considered a min
      if (fastestMean >= DNF) return []; //DNF was best

      return Object.keys(roomParticipants).filter(
        (participant) => userMeans[participant] == fastestMean
      );
    }
    case "FASTEST_OF": {
      const setSolves = currentSet.solves;

      if (setSolves.length < (nSolves || Number.POSITIVE_INFINITY)) return [];

      const userMinTimes: Record<string, number> = Object.keys(
        roomParticipants
      ).reduce((acc, id) => {
        acc[id] = Result.minOf(
          setSolves.map((roomSolve) =>
            Object.keys(roomSolve.solve.results).includes(id)
              ? Result.fromIResult(roomSolve.solve.results[id])
              : new Result(0, "DNF")
          )
        );
        return acc;
      }, {} as Record<string, number>);

      // return all fastest users
      const fastestTime = Math.min(...Object.values(userMinTimes));
      // prevent DNF from being considered a min
      if (fastestTime >= DNF) return []; //DNF was best

      return Object.keys(roomParticipants).filter(
        (participant) => userMinTimes[participant] == fastestTime
      );
    }
    default:
      throw Error(
        `Unimplemented setFormat for findSetWinners: ${room.settings.raceSettings.setFormat}`
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
  const currentSolve = getLatestSolve(room);
  if (!currentSolve || room.settings.raceSettings.roomFormat === "CASUAL")
    return false;

  const roomParticipants = room.settings.teamSettings.teamsEnabled
    ? Object.values(room.teams)
    : Object.values(room.users);

  const nSets = room.settings.raceSettings.nSets;
  switch (room.settings.raceSettings.matchFormat) {
    case "BEST_OF":
      return (
        roomParticipants.filter(
          (participant) => participant.setWins > nSets / 2
        ).length > 0 ||
        (room.currentSet === nSets && checkSetFinished(room))
      );
    case "FIRST_TO":
      return (
        roomParticipants.filter((participant) => participant.setWins >= nSets)
          .length > 0
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
  const currentSolve = getLatestSolve(room);
  //no set wins when room is a casual room
  if (!currentSolve || room.settings.raceSettings.roomFormat == "CASUAL")
    return [];
  const roomParticipants = room.settings.teamSettings.teamsEnabled
    ? room.teams
    : room.users;
  const nSets = room.settings.raceSettings.nSets;

  switch (room.settings.raceSettings.matchFormat) {
    case "BEST_OF":
      //user has won for sure if they have the majority of sets
      const candidateMatchWinners = Object.keys(roomParticipants).filter(
        (participantId) => roomParticipants[participantId].setWins > nSets / 2
      );
      if (candidateMatchWinners.length > 0) {
        return candidateMatchWinners;
      }

      // otherwise, it is possible to win w/o majority of sets. if the last set is done, need to check for max set wins of all users
      if (room.currentSet === nSets && currentSolve.finished) {
        /**
         * in AO/MO/FO mode, set only finishes when all solves are done.
         * in BO/FT mode, set can finish before the last solve when a user takes the set. In this case, we rely on other functions not checking for match winners before the set is finished (either by set win or by number of solves)
         */
        if (
          ((room.settings.raceSettings.setFormat === "AVERAGE_OF" ||
            room.settings.raceSettings.setFormat === "MEAN_OF" ||
            room.settings.raceSettings.setFormat === "FASTEST_OF") &&
            currentSolve.index === room.settings.raceSettings.nSolves) ||
          room.settings.raceSettings.setFormat === "BEST_OF" ||
          room.settings.raceSettings.setFormat === "FIRST_TO"
        ) {
          //scan over all users. note that this includes users who are no longer competing or active.
          let candidateWinners: string[] = [];
          let maxSetWins = 1; //this prevents users with 0 set wins from counting as winners

          for (const [participantId, participant] of Object.entries(
            roomParticipants
          )) {
            if (participant.setWins === maxSetWins) {
              candidateWinners.push(participantId);
            } else if (participant.setWins > maxSetWins) {
              maxSetWins = participant.setWins;
              candidateWinners = [participantId];
            }
          }

          return candidateWinners;
        }
      }
      return [];
    case "FIRST_TO":
      //user has won only when they win n sets.
      return Object.keys(roomParticipants).filter(
        (participantId) => roomParticipants[participantId].setWins >= nSets
      );
    default:
      return [];
  }
}

//TODO - move this to the file with type definition and/or merge it
const teamReduceFunctionToFunction = new Map<
  TeamReduceFunction,
  (results: IResult[]) => number
>([
  ["FASTEST", Result.iMinOf],
  ["MEAN", Result.iMeanOf],
  ["SUM", Result.iSumOf],
  ["MEDIAN", Result.iMedianOf],
]);

export function checkTeamFinished(room: IRoom, teamId: string) {
  const currentSolve = getLatestSolve(room);
  if (
    !room.settings.teamSettings.teamsEnabled ||
    !room.teams[teamId] ||
    !currentSolve
  ) {
    return false;
  }

  switch (room.settings.teamSettings.teamFormatSettings.teamSolveFormat) {
    case "ALL":
      const teamMembers = room.teams[teamId].team.members;
      if (teamMembers.length === 0) {
        return false;
      }
      return teamMembers.every(
        (userId) =>
          userId in currentSolve.solve.attempts &&
          currentSolve.solve.attempts[userId].finished
      );
    case "ONE":
      const currUid = room.teams[teamId].currentMember;
      if (!currUid) {
        // TODO - consider if this should be true
        return false;
      }
      return (
        currentSolve.solve.attempts[currUid] &&
        currentSolve.solve.attempts[currUid].finished
      );
    default:
      throw new Error("Unimplemented team solve format");
  }
}

export function finishTeamSolve(room: IRoom, teamId: string) {
  const currentSolve = getLatestSolve(room);

  if (
    !room.settings.teamSettings.teamsEnabled ||
    !room.teams[teamId] ||
    !currentSolve
  ) {
    return undefined;
  }

  switch (room.settings.teamSettings.teamFormatSettings.teamSolveFormat) {
    case "ALL":
      const teamMembers = room.teams[teamId].team.members;

      const teamMemberResults = teamMembers.map(
        (userId) =>
          (
            currentSolve.solve.attempts[userId] as Extract<
              IAttempt,
              { finished: true }
            >
          ).result
      );

      // let this error out if the reduction function isn't defined - should get caught in dev
      const reduceFunc = teamReduceFunctionToFunction.get(
        room.settings.teamSettings.teamFormatSettings.teamReduceFunction
      )!;

      const teamResult: IResult = new Result(
        reduceFunc(teamMemberResults),
        "OK"
      ).toIResult();

      currentSolve.solve.results[teamId] = teamResult;
      room.teams[teamId].currentResult = teamResult;
      room.teams[teamId].solveStatus = "FINISHED";

      return teamResult;

    case "ONE":
      const currUid = room.teams[teamId].currentMember;
      if (!currUid) {
        return undefined;
      }
      if (
        !currentSolve.solve.attempts[currUid] ||
        !currentSolve.solve.attempts[currUid].finished
      ) {
        console.warn(
          "Tried to finish team solve when team representative not finished..."
        );
        return undefined;
      }

      const result = currentSolve.solve.attempts[currUid].result;

      currentSolve.solve.results[teamId] = result;
      room.teams[teamId].currentResult = result;
      room.teams[teamId].solveStatus = "FINISHED";

      return result;

    default:
      console.warn(
        `Unimplemented team solve format: ${room.settings.teamSettings.teamFormatSettings}`
      );
  }
}

/**
 * Processes a new result from a user. Updates users, teams, current solve.
 * Returns an IRoomTeam if a a team was updated during this operation.
 */
export function processNewResult(
  room: IRoom,
  userId: string,
  result: IResult
): IRoomTeam | undefined {
  const currentSolve = getLatestSolve(room);
  if (!currentSolve) return;

  // update user attempt, currentResult
  currentSolve.solve.attempts[userId] = {
    ...currentSolve.solve.attempts[userId],
    finished: true,
    result: result,
  };
  room.users[userId].currentResult = result;

  // update solve results if applicable
  if (room.settings.teamSettings.teamsEnabled) {
    const teamId = room.users[userId].currentTeam;
    if (!teamId) {
      console.log(
        `User ${userId} tried to submit a result for their team when they do not have a team assigned.`
      );
      return;
    }

    if (checkTeamFinished(room, teamId)) {
      finishTeamSolve(room, teamId);
      return room.teams[teamId];
    }
  } else {
    // teams disabled - just insert result into results
    currentSolve.solve.results[userId] = result;
  }
}

/**
 * Checks if the current solve is done.
 * To keep consistent with the other parts of the backend, we check if
 * all relevant users have solve status FINISHED.
 *
 * TODO: reimplement/redesign the backend so that solves are really finished once all relevant results are in (check the results array of the solve instead)
 */
export function checkRoomSolveFinished(room: IRoom): boolean {
  const currentSolve = getLatestSolve(room);
  if (!currentSolve) return false;

  // 1. Calculate correct set of competing users
  let competingUsers = Object.values(room.users);
  if (room.settings.teamSettings.teamsEnabled) {
    // teams
    switch (room.settings.teamSettings.teamFormatSettings.teamSolveFormat) {
      case "ONE":
        //get users that are marked as the active user in the team
        competingUsers = Object.values(room.teams)
          .map((roomTeam) => roomTeam.currentMember)
          .map((userId) => (userId ? room.users[userId] : undefined))
          .filter((user) => user != null);
        break;
      case "ALL":
        competingUsers = Array.from(
          // use a set here to deduplicate (which shouldn't happen, but just in case)
          new Set(
            Object.values(room.teams).flatMap(
              (roomTeam) => roomTeam.team.members
            )
          )
        )
          .map((userId) => room.users[userId])
          .filter((user) => user != null && user.competing && user.active);
        break;
      default:
        return false;
    }
  } else {
    // no teams - get all competing and active users
    competingUsers = competingUsers.filter(
      (user) => user.competing && user.active
    );
  }

  // 2. Check if all competing users are done
  if (competingUsers.length == 0) return false;

  let allUsersFinished: boolean = true;
  for (const roomUser of competingUsers) {
    if (
      // roomUser.solveStatus !== "FINISHED"

      // Testing: using attempts to know if the user is done
      !currentSolve.solve.attempts[roomUser.user.id] ||
      !currentSolve.solve.attempts[roomUser.user.id].finished
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
 *  Find the winner of the current solve. Awards points. Does not calculate set, match
 *  wins - should be done outside of this function
 */
export function finishRoomSolve(room: IRoom) {
  const currentSolve = getLatestSolve(room);
  const currentSet = getLatestSet(room);
  if (!currentSolve || !currentSet) return;

  currentSolve.finished = true;

  const results = currentSolve.solve.results;
  const participants = room.settings.teamSettings.teamsEnabled
    ? room.teams
    : room.users;

  if (
    room.settings.raceSettings.roomFormat === "CASUAL" ||
    room.settings.raceSettings.setFormat === "BEST_OF" ||
    room.settings.raceSettings.setFormat === "FIRST_TO"
  ) {
    let currFastestResult: Result = new Result(0, "DNF");
    let solveWinners: string[] = [];

    for (const [participantId, iResult] of Object.entries(results)) {
      const result = Result.fromIResult(iResult);
      if (iResult.penalty !== "DNF") {
        if (result.isLessThan(currFastestResult)) {
          solveWinners = [];
          solveWinners.push(participantId);
          currFastestResult = result;
        } else if (
          result.equals(currFastestResult) &&
          iResult.penalty !== "DNF"
        ) {
          solveWinners.push(participantId);
        }
      }
    }

    currentSolve.winners = solveWinners;
    for (const pid of solveWinners) {
      if (room.settings.teamSettings.teamsEnabled) {
        participants[pid].points += 1;
      } else {
        participants[pid].points += 1;
      }
    }
  } else if (
    room.settings.raceSettings.setFormat === "AVERAGE_OF" ||
    room.settings.raceSettings.setFormat === "MEAN_OF" ||
    room.settings.raceSettings.setFormat === "FASTEST_OF"
  ) {
    /**
     * update points to reflect the current average/mean for each user.
     * the average is taken by removing best and worst solves and taking mean of the rest.
     * for now, any N <= 2 is a mean instead of an average
     *
     * we have to recalculate for active & competing users at each point.
     */
    const setResults = currentSet.solves.map((solve) => solve.solve.results);

    for (const [pid, participant] of Object.entries(participants)) {
      //recalculate mean over recent set solves
      const userResults = setResults.map((resultMap) =>
        Object.hasOwn(resultMap, pid)
          ? resultMap[pid]
          : new Result(0, "DNF").toIResult()
      );

      if (room.settings.raceSettings.setFormat === "AVERAGE_OF") {
        participant.points = Result.iAverageOf(userResults);
      } else if (room.settings.raceSettings.setFormat === "MEAN_OF") {
        participant.points = Result.iMeanOf(userResults);
      } else if (room.settings.raceSettings.setFormat === "FASTEST_OF") {
        // fastest of
        participant.points = Result.iMinOf(userResults);
      }
    }
  }

  // Mark solve as finished
  currentSolve.finished = true;
}

/**
 * Creates a new team. Do all validation outside of this function.
 */
export function createTeam(room: IRoom, teamName: string) {
  // generate unique team id
  let teamId: string = new ObjectId().toString();
  while (room.teams[teamId] != null) {
    teamId = new ObjectId().toString();
  }

  // we don't validate the team name - just generate unique ids
  const newTeam: IRoomTeam = {
    points: 0,
    setWins: 0,
    solveStatus: "IDLE",
    team: {
      id: teamId,
      name: teamName,
      members: [],
    },
  };

  return newTeam;
}

/**
 * Makes user join a team. Do all validation outside of this function
 *
 * Possibly returns a string in SocketResponse if a new scramble was genned for this user
 */
export async function userJoinTeam(
  room: IRoom,
  userId: string,
  teamId: string
): Promise<
  SocketResponse<{ attempt: IAttempt | undefined; resetTeamResult: boolean }>
> {
  if (!room.settings.teamSettings.teamsEnabled) {
    return { success: false, reason: "Teams not enabled" };
  }
  const user = room.users[userId];
  const team = room.teams[teamId];
  if (!user || !team) {
    return { success: false, reason: "User or team doesn't exist" };
  }

  // 1. check team full
  if (
    room.settings.teamSettings.maxTeamCapacity &&
    team.team.members.length >= room.settings.teamSettings.maxTeamCapacity
  ) {
    return {
      success: false,
      reason: `Team full (${team.team.members.length}/${room.settings.teamSettings.maxTeamCapacity})`,
    };
  }

  // 2. check if user not on another team already.
  if (
    room.users[userId].currentTeam !== undefined &&
    room.teams[room.users[userId].currentTeam]
  ) {
    return {
      success: false,
      reason: `Already on another team: ${
        room.teams[room.users[userId].currentTeam]
      }`,
    };
  }

  // 3. put user on team
  team.team.members.push(userId);
  if (
    room.settings.teamSettings.teamFormatSettings.teamSolveFormat === "ONE" &&
    team.team.members.length === 1 &&
    room.state === "STARTED"
  ) {
    // user will be the active member
    team.currentMember = userId;
  }

  room.users[userId].currentTeam = teamId;
  room.users[userId].competing = true; //in teams mode, competing = on team or not

  const extraData = { resetTeamResult: false, attempt: undefined } as {
    attempt: IAttempt | undefined;
    resetTeamResult: boolean;
  };
  const currentSolve = getLatestSolve(room);
  if (room.state === "STARTED" && currentSolve) {
    // generate a scramble for the user (create an attempt) if they're joining in the middle of a solve AND (we are in ALL mode || we are in ONE mode and it's this user's turn)
    if (
      room.settings.teamSettings.teamFormatSettings.teamSolveFormat === "ALL" &&
      room.settings.teamSettings.teamFormatSettings.teamScrambleFormat ===
        "DIFFERENT"
    ) {
      const newScramble = await generateScramble(room.settings.roomEvent);
      currentSolve.solve.scrambles.push(newScramble);
      newAttempt(room, newScramble, userId, teamId);

      extraData.attempt = currentSolve.solve.attempts[userId];
    } else if (
      (room.settings.teamSettings.teamFormatSettings.teamSolveFormat ===
        "ONE" &&
        team.team.members.length === 1) ||
      (room.settings.teamSettings.teamFormatSettings.teamSolveFormat ===
        "ALL" &&
        room.settings.teamSettings.teamFormatSettings.teamScrambleFormat ===
          "SAME")
    ) {
      newAttempt(room, currentSolve.solve.scrambles[0], userId, teamId);

      extraData.attempt = currentSolve.solve.attempts[userId];
    }

    if (
      room.settings.teamSettings.teamFormatSettings.teamSolveFormat === "ALL"
    ) {
      delete currentSolve.solve.results[teamId];
      room.teams[teamId].currentResult = undefined;
      room.teams[teamId].solveStatus = "IDLE";

      extraData.resetTeamResult = true;
    }
  }

  return { success: true, data: extraData };
}

export async function userLeaveTeam(
  room: IRoom,
  userId: string,
  teamId: string
): Promise<
  SocketResponse<{
    refreshedTeamResult?: { teamId: string; result: IResult };
    newAttempt?: { userId: string; attempt: IAttempt };
  }>
> {
  if (!room.settings.teamSettings.teamsEnabled) {
    return { success: false, reason: "teams not enabled" };
  }
  const user = room.users[userId];
  const team = room.teams[teamId];
  if (!user || !team) {
    return { success: false, reason: "user or team doesn't exist" };
  }

  const userIdx = team.team.members.indexOf(userId);
  if (userIdx == -1) {
    return { success: false, reason: "user doesn't exist in team" };
  }
  team.team.members.splice(userIdx, 1);
  room.users[userId].currentTeam = undefined;
  room.users[userId].competing = false; //in teams mode, competing = on team or not

  const extraData: {
    refreshedTeamResult?: { teamId: string; result: IResult };
    newAttempt?: { userId: string; attempt: IAttempt };
  } = {};

  // remove the current attempt from the user.
  const currentSolve = getLatestSolve(room);
  if (currentSolve) {
    delete currentSolve.solve.attempts[userId];
    user.currentResult = undefined;

    // always reset the team solve.
    delete currentSolve.solve.results[team.team.id];
    team.currentResult = undefined;
    team.solveStatus = "IDLE";

    // if applicable, recalculate the team result.
    if (checkTeamFinished(room, teamId)) {
      finishTeamSolve(room, teamId);

      extraData.refreshedTeamResult = {
        teamId: teamId,
        result: currentSolve.solve.results[team.team.id],
      };
    }
  }

  if (room.settings.teamSettings.teamFormatSettings.teamSolveFormat === "ONE") {
    if (team.team.members.length === 0) {
      team.currentMember = undefined;
    } else {
      if (team.currentMember === userId) {
        // since we removed the user at index, new current member is at this idx
        team.currentMember =
          team.team.members[userIdx % team.team.members.length];

        // if there are solves, assign this new current member an attempt.

        if (currentSolve) {
          const newAttempt: IAttempt = {
            finished: false,
            scramble: currentSolve.solve.scrambles[0],
          };
          currentSolve.solve.attempts[team.currentMember] = newAttempt;
          extraData.newAttempt = {
            userId: team.currentMember,
            attempt: newAttempt,
          };
        }
      }
    }
  }

  return { success: true, data: extraData };
}

/**
 * figures out the correct number of scrambles to generate at this moment.
 */
function getNumScramblesToGenerate(room: IRoom) {
  let numScrambles = 1;
  if (
    room.settings.teamSettings.teamsEnabled &&
    room.settings.teamSettings.teamFormatSettings.teamSolveFormat === "ALL" &&
    room.settings.teamSettings.teamFormatSettings.teamScrambleFormat ===
      "DIFFERENT"
  ) {
    numScrambles =
      room.settings.teamSettings.maxTeamCapacity ??
      Math.max(
        ...Object.values(room.teams).map((team) => team.team.members.length)
      );
  }
  return numScrambles;
}

export function newRoomSet(room: IRoom): IRoomSet {
  const currentSet = getLatestSet(room);
  if (currentSet && !currentSet.finished) {
    //otherwise, since the latest set isn't finished, we will fail.
    console.warn(
      `Tried to start a new set in room ${room.id} without finishing the latest set`
    );
  }

  const newSet: IRoomSet = {
    solves: [],
    index: room.currentSet + 1,
    winners: [],
    finished: false,
  };

  room.match.sets.push(newSet);

  room.currentSet += 1;
  room.currentSolve = 0;
  return newSet;
}

/**
 * Generates a new solve for a room and its users. Does not update wins or points
 *
 */
export async function newRoomSolve(room: IRoom) {
  //get current solve Id. Consider storing a currentSolveId field in the room to not need to do this
  const currSolveId = getCurrentSolveId(room);

  let currentSet = getLatestSet(room);
  if (!currentSet) {
    currentSet = newRoomSet(room);
  }

  const newSolve: ISolve = {
    id: currSolveId + 1,
    scrambles: [],
    attempts: {},
    results: {},
  };

  const newRoomSolve: IRoomSolve = {
    solve: newSolve,
    index: room.currentSolve + 1,
    finished: false,
    winners: [],
  };
  room.currentSolve += 1;
  currentSet.solves.push(newRoomSolve);

  if (
    room.settings.teamSettings.teamsEnabled &&
    room.settings.teamSettings.teamFormatSettings.teamSolveFormat === "ONE"
  ) {
    // update the currentMember field of each team
    for (const team of Object.values(room.teams)) {
      if (team.team.members.length > 0) {
        // rolls current member to the "next" in the list, or idx 0 if nonexistent
        const currIdx = team.currentMember
          ? team.team.members.indexOf(team.currentMember)
          : -1;
        const nextIdx = (currIdx + 1) % team.team.members.length;

        team.currentMember = team.team.members[nextIdx];
      }
    }
  }

  // generates scrambles + properly sets attempts, results
  await resetSolve(room);

  return newRoomSolve;
}

/**
 * Creates a new attempt for a user.
 * Do all validation outside this functdion.
 */
export function newAttempt(
  room: IRoom,
  scramble: string,
  userId: string,
  teamId?: string
) {
  const currentSolve = getLatestSolve(room);
  if (!currentSolve) return;

  const newAttempt = {
    scramble: scramble,
    finished: false,
    team: teamId,
  } as IAttempt;
  currentSolve.solve.attempts[userId] = newAttempt;
  return newAttempt;
}

/**
 * Resets the current solve and generate new scrambles
 */
export async function resetSolve(room: IRoom) {
  const currentSolve = getLatestSolve(room);
  if (!currentSolve) return;

  const numScrambles = getNumScramblesToGenerate(room);
  const solveScrambles = await generateScrambles(
    room.settings.roomEvent,
    numScrambles
  );
  const teamSettings = room.settings.teamSettings;

  currentSolve.solve.scrambles = solveScrambles;

  //reset attempts
  const eligibleUsers = teamSettings.teamsEnabled
    ? teamSettings.teamFormatSettings.teamSolveFormat === "ALL"
      ? Object.values(room.teams).flatMap((team) =>
          team.team.members
            .map((userId) => room.users[userId])
            .filter((user) => user !== undefined)
        )
      : Object.values(room.teams)
          .map((team) => team.currentMember)
          .filter((uid) => uid !== undefined)
          .map((uid) => room.users[uid])
          .filter((user) => user !== undefined)
    : Object.values(room.users).filter(
        (roomUser) => roomUser.active && roomUser.competing
      );

  for (const roomUser of eligibleUsers) {
    currentSolve.solve.attempts[roomUser.user.id] = {
      scramble:
        teamSettings.teamsEnabled &&
        teamSettings.teamFormatSettings.teamSolveFormat === "ALL" &&
        teamSettings.teamFormatSettings.teamScrambleFormat === "DIFFERENT"
          ? currentSolve.solve.scrambles[
              Math.max(
                room.teams[roomUser.currentTeam!].team.members.indexOf(
                  roomUser.user.id
                ),
                0
              )
            ]
          : currentSolve.solve.scrambles[0]!,
      finished: false,
      ...(teamSettings.teamsEnabled ? { team: roomUser.currentTeam } : {}),
    };
  }

  //reset results
  currentSolve.solve.results = {};

  for (const roomUser of Object.values(room.users)) {
    roomUser.currentResult = undefined;
    // we don't set the user's solve status here - client will reset it upon receiving solve_finished
  }
  for (const roomTeam of Object.values(room.teams)) {
    roomTeam.currentResult = undefined;
    roomTeam.solveStatus = "IDLE";
  }
}

/**
 * Resets the room
 */
export function resetRoom(room: IRoom) {
  room.state = "WAITING";
  room.match = {
    sets: [],
    winners: [],
    finished: false,
  };
  room.currentSet = 0;
  room.currentSolve = 0;

  for (const roomUser of Object.values(room.users)) {
    roomUser.points = 0;
    roomUser.setWins = 0;
    roomUser.solveStatus = "IDLE";
    roomUser.currentResult = undefined;

    // set all users to spectating if in teams mode
    if (room.settings.teamSettings.teamsEnabled) {
      roomUser.competing = false;
    }
  }

  for (const roomTeam of Object.values(room.teams)) {
    roomTeam.points = 0;
    roomTeam.setWins = 0;
    roomTeam.solveStatus = "IDLE";
    roomTeam.currentResult = undefined;
    roomTeam.currentMember = undefined;

    // make sure all team members are competing
    roomTeam.team.members.forEach((uid) => {
      if (room.users[uid]) {
        room.users[uid].competing = true;
      }
    });
  }
}

/**
 * Handles the step of user joining a room.
 * Assumes all validation is done before this is called.
 *
 * Returns a boolean valued as if the user is new to the room.
 */
export function userJoinRoom(room: IRoom, user: IUserInfo) {
  let newUser = true;

  if (Object.hasOwn(room.users, user.id)) {
    room.users[user.id].active = true;
    room.users[user.id].joinedAt = new Date();

    newUser = false;
  } else {
    const roomUser: IRoomUser = {
      user: user,
      points: 0,
      setWins: 0,
      joinedAt: new Date(),
      active: true,
      competing: true,
      banned: false,
      solveStatus: "IDLE",
      currentResult: undefined,
    };

    room.users[user.id] = roomUser;
  }

  // if in teams mode, user is going to default to spectating.
  if (room.settings.teamSettings.teamsEnabled) {
    room.users[user.id].competing = false;
  } else {
    // we need to explicitly set a user's scramble when they join.
    //  for now, joining with teams enabled disables competing, so we just cover no teams case - which is easy
    const currentSolve = getLatestSolve(room);
    if (currentSolve) {
      newAttempt(room, currentSolve.solve.scrambles[0]!, user.id);
    }
  }

  // if there is no host for some reason, promote this user to be host
  if (!room.host) {
    room.host = room.users[user.id].user;
  }

  return newUser;
}

function getCurrentSolveId(room: IRoom) {
  const latestSolve = getLatestSolve(room);
  return latestSolve?.solve.id ?? 0;
}
