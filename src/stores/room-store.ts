import {
  Access,
  IRoom,
  RaceSettings,
  RoomEvent,
  TeamSettings,
} from "@/types/room";
import { IRoomMatch, IRoomSet, IRoomSolve } from "@/types/room-solve";
import {
  IRoomParticipant,
  IRoomTeam,
  IRoomUser,
} from "@/types/room-participant";
import { RoomState } from "@/types/room";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { timerAllowsInspection, TimerType } from "@/types/timer-type";
import { IResult, Penalty, Result } from "@/types/result";
import { SolveStatus } from "@/types/status";
import { IAttempt } from "@/types/solve";

export type RoomStore = {
  // room related state
  roomName: string;
  hostId: string;
  users: Record<string, IRoomUser>;
  teams: Record<string, IRoomTeam>;
  match: IRoomMatch;
  currentSet: number;
  currentSolve: number;
  roomEvent: RoomEvent;
  roomState: RoomState;
  access: Access;
  raceSettings: RaceSettings;
  teamSettings: TeamSettings;
  maxUsers?: number;

  //local (client) states
  localPenalty: Penalty; //penalty associated with current solve
  localResult: Result; //result associated with current solve
  localSolveStatus: SolveStatus; //current solving state of client
  liveTimerStartTime: number; //the start time for the client's current solve

  //user settings
  timerType: TimerType; //type of timer client is using
  useInspection: boolean; //is inspection on?
  drawScramble: boolean; //should we draw the scramble?

  /**
   * Map from user IDs to timestamps of when each user (potentially) started a live timer.
   * This is used to implement live time sharing (storage in client side) b/c storing on server makes calculating that live time difficult.
   */
  userLiveTimerStartTimes: Record<string, number>;
  userLiveTimes: Record<string, number>;

  setLocalPenalty: (penalty: Penalty) => void;
  setLocalResult: (result: Result) => void;
  setRoomName: (roomName: string) => void;
  setHostId: (hostId: string) => void;
  setLiveTimerStartTime: (time: number) => void;

  setUseInspection: (useInspection: boolean) => void;
  setTimerType: (timerType: TimerType) => void;
  setDrawScramble: (drawScramble: boolean) => void;

  isUserHost: (userId: string | undefined) => boolean;

  updateLocalSolveStatus: (event?: string) => void;
  resetLocalSolveStatus: () => void;
  resetLocalSolve: () => void;

  addUserLiveStartTime: (userId: string, startTime: number) => void;
  clearUserLiveStartTimes: () => void;
  addUserLiveStopTime: (userId: string, startTime: number) => void;
  clearUserLiveTimes: () => void;

  //only handles room information - not any local user info
  handleRoomUpdate: (room: IRoom) => void;

  //update room user information from server - used when initializing the user on client side
  handleRoomUserUpdate: (roomUser: IRoomUser) => void;

  createAttempt: (userId: string, attempt: IAttempt) => void;

  deleteAttempt: (userId: string) => void;

  addNewSolve: (newSolve: IRoomSolve) => void;

  updateLatestSolve: (updatedSolve: IRoomSolve) => void;

  resetLatestSolve: (newSolve: IRoomSolve) => void;

  addNewSet: (newSet: IRoomSet) => void;

  finishSolve: (
    solve: IRoomSolve,
    participants: Record<string, IRoomParticipant>
  ) => void;

  finishSet: (setWinners: string[]) => void;

  finishMatch: (matchWinners: string[]) => void;

  updateSolveStatus: (userId: string, newStatus: SolveStatus) => void;

  userToggleCompeting: (userId: string, newCompeting: boolean) => void;

  userJoin: (user: IRoomUser) => void;

  userUpdate: (user: IRoomUser) => void;

  userBanned: (userId: string) => void;

  userUnbanned: (userId: string) => void;

  createTeams: (teams: IRoomTeam[]) => void;

  deleteTeam: (teamId: string) => void;

  userJoinTeam: (
    user: IRoomUser,
    team: IRoomTeam,
    extraData: { attempt: IAttempt | undefined; resetTeamResult: boolean }
  ) => void;

  userLeaveTeam: (user: IRoomUser, team: IRoomTeam) => void;

  updateTeam: (team: IRoomTeam) => void;

  updateTeams: (teams: Record<string, IRoomTeam>) => void;

  startRoom: (solve: IRoomSolve) => void;

  resetRoom: () => void;

  addUserResult: (userId: string, result: IResult) => void;

  addResult: (participantId: string, result: IResult) => void;
};

// export const createRoomStore = (): StoreApi<RoomStore> =>
//   createStore<RoomStore>((set, get) => ({
export function createRoomStore() {
  return create<RoomStore>()(
    persist(
      (set, get) => {
        //helper functions
        const getLatestSet = (match: IRoomMatch): IRoomSet | undefined => {
          if (match.sets.length === 0) return;

          return match.sets.at(-1);
        };

        const getLatestSolve = (match: IRoomMatch): IRoomSolve | undefined => {
          const latestSet = getLatestSet(match);
          if (!latestSet || latestSet.solves.length === 0) return;

          return latestSet.solves.at(-1);
        };

        return {
          // general room state
          roomName: "",
          hostId: "",
          users: {},
          teams: {},
          match: {
            sets: [],
            winners: [],
            finished: false,
          },
          currentSet: 0,
          currentSolve: 0,
          roomEvent: "333",
          teamsEnabled: false,
          roomState: "WAITING",
          roomWinners: [],
          access: { visibility: "PUBLIC" },
          raceSettings: { roomFormat: "CASUAL" },
          teamSettings: { teamsEnabled: false },
          maxUsers: undefined,

          // local (client) state/options
          localPenalty: "OK",
          localResult: new Result(""),
          localSolveStatus: "IDLE",
          liveTimerStartTime: 0,

          //user settings
          timerType: "KEYBOARD",
          useInspection: false,
          drawScramble: true,

          userLiveTimerStartTimes: {},
          userLiveTimes: {},
          setLocalPenalty: (penalty: Penalty) =>
            set(() => ({ localPenalty: penalty })),
          setLocalResult: (result: Result) =>
            set(() => ({ localResult: result })),
          setRoomName: (roomName: string) =>
            set(() => ({ roomName: roomName })),
          setHostId: (hostId: string) => set(() => ({ hostId: hostId })),
          setLiveTimerStartTime: (time: number) =>
            set(() => ({ liveTimerStartTime: time })),
          isUserHost: (userId: string | undefined) => {
            if (userId === undefined) return false;
            const hostId = get().hostId;
            return userId === hostId;
          },
          setUseInspection: (useInspection: boolean) =>
            set(() => ({ useInspection: useInspection })),
          setTimerType: (timerType: TimerType) =>
            set(() => ({ timerType: timerType })),
          setDrawScramble: (drawScramble: boolean) =>
            set(() => ({ drawScramble: drawScramble })),
          /**
           * Handles all state transitions for local SolveStatus.
           *
           * @param event event causing status update.
           */
          updateLocalSolveStatus: (event?: string) => {
            switch (get().localSolveStatus) {
              case "IDLE":
                if (
                  get().useInspection &&
                  timerAllowsInspection(get().timerType) &&
                  event !== "TIMER_START"
                ) {
                  set(() => ({ localSolveStatus: "INSPECTING" }));
                } else {
                  set(() => ({ localSolveStatus: "SOLVING" }));
                }
                break;
              case "INSPECTING":
                if (
                  get().timerType === "BLUETOOTH" &&
                  event === "TIMER_RESET"
                ) {
                  set(() => ({ localSolveStatus: "IDLE" }));
                } else {
                  set(() => ({ localSolveStatus: "SOLVING" }));
                }
                break;
              case "SOLVING":
                set(() => ({ localSolveStatus: "SUBMITTING" }));
                break;
              case "SUBMITTING":
                if (event === "SUBMIT_TIME") {
                  set(() => ({ localSolveStatus: "FINISHED" }));
                } else if (event === "REDO_SOLVE") {
                  get().resetLocalSolveStatus();
                }
                break;
              case "FINISHED":
                get().resetLocalSolveStatus();
                break;
            }
          },
          resetLocalSolveStatus: () => {
            switch (get().timerType) {
              case "KEYBOARD":
                set(() => ({ localSolveStatus: "IDLE" }));
                break;
              case "TYPING":
                set(() => ({ localSolveStatus: "SOLVING" }));
                break;
              case "BLUETOOTH":
                set(() => ({ localSolveStatus: "IDLE" }));
                break;
            }
          },
          resetLocalSolve: () => {
            get().resetLocalSolveStatus();
            get().setLocalResult(new Result(""));
            get().setLocalPenalty("OK");
          },

          /**
           * We need to create an entire new Map here to adhere to the Zustand rules
           * This shouldn't cause any big issues since we expect not to have massive rooms but TODO find a better way to handle this
           */
          addUserLiveStartTime: (userId: string, time: number) =>
            set((state) => {
              const updatedUserLiveStartTimes = {
                ...state.userLiveTimerStartTimes,
              };
              updatedUserLiveStartTimes[userId] = time;
              return { userLiveTimerStartTimes: updatedUserLiveStartTimes };
            }),
          clearUserLiveStartTimes: () =>
            set(() => ({ userLiveTimerStartTimes: {} })),
          addUserLiveStopTime: (userId: string, time: number) =>
            set((state) => {
              const startTime = get().userLiveTimerStartTimes[userId];
              if (startTime === undefined) return {};
              const updatedUserLiveStartTimes = {
                ...state.userLiveTimerStartTimes,
              };
              delete updatedUserLiveStartTimes[userId];
              const updatedUserLiveTimes = { ...state.userLiveTimes };
              updatedUserLiveTimes[userId] = time - startTime;
              return {
                userLiveTimerStartTimes: updatedUserLiveStartTimes,
                userLiveTimes: updatedUserLiveTimes,
              };
            }),
          clearUserLiveTimes: () => set(() => ({ userLiveTimes: {} })),
          handleRoomUpdate: (room: IRoom) =>
            set(() => ({
              roomName: room.settings.roomName,
              users: room.users,
              teams: room.teams,
              hostId: room.host ? room.host.id : "",
              match: room.match,
              // solves: room.solves,
              currentSet: room.currentSet,
              currentSolve: room.currentSolve,
              roomEvent: room.settings.roomEvent,
              raceSettings: room.settings.raceSettings,
              teamSettings: room.settings.teamSettings,
              maxUsers: room.settings.maxUsers,
              roomState: room.state,
              // roomWinners: room.winners || [],
              access: room.settings.access,
            })),
          handleRoomUserUpdate: (roomUser: IRoomUser) =>
            set(() => ({
              localPenalty: roomUser.currentResult?.penalty ?? "OK",
              localResult: roomUser.currentResult
                ? Result.fromIResult(roomUser.currentResult)
                : new Result(""),
              localSolveStatus: roomUser.solveStatus,
            })),
          createAttempt: (userId: string, attempt: IAttempt) =>
            set((state) => {
              const updatedMatch = { ...state.match };
              const currentSolve = getLatestSolve(updatedMatch);
              if (!currentSolve) {
                return {};
              }
              currentSolve.solve.attempts[userId] = attempt;
              return {
                match: updatedMatch,
              };
            }),
          deleteAttempt: (userId: string) =>
            set((state) => {
              const updatedMatch = { ...state.match };
              const currentSolve = getLatestSolve(updatedMatch);
              if (!currentSolve) {
                return {};
              }

              delete updatedMatch.sets.at(-1)!.solves.at(-1)!.solve.attempts[
                userId
              ];
              return {
                match: updatedMatch,
              };
            }),
          addNewSolve: (newSolve: IRoomSolve) =>
            set(() => {
              const updatedParticipants = get().teamSettings.teamsEnabled
                ? { ...get().teams }
                : { ...get().users };
              for (const participant of Object.values(updatedParticipants)) {
                participant.currentResult = undefined;
              }

              const updatedMatch = { ...get().match };
              const currentSet = getLatestSet(updatedMatch);
              if (!currentSet) return {};
              currentSet.solves.push(newSolve);

              return {
                match: updatedMatch,
                currentSolve: get().currentSolve + 1,
                ...(get().teamSettings.teamsEnabled
                  ? { teams: updatedParticipants as Record<string, IRoomTeam> }
                  : {
                      users: updatedParticipants as Record<string, IRoomUser>,
                    }),
              };
            }),
          addNewSet: (newSet: IRoomSet) =>
            set((state) => {
              return {
                match: { ...state.match, sets: [...state.match.sets, newSet] },
                currentSet: state.currentSet + 1,
                currentSolve: 0,
              };
            }),

          updateLatestSolve: (updatedSolve: IRoomSolve) =>
            set((state) => {
              const updatedMatch = { ...state.match };
              if (
                !getLatestSolve(updatedMatch) ||
                getLatestSet(updatedMatch)!.solves.length === 0
              )
                return {};

              updatedMatch.sets.at(-1)!.solves[
                updatedMatch.sets.at(-1)!.solves.length - 1
              ] = updatedSolve;
              return { match: updatedMatch };
            }),
          resetLatestSolve: (newSolve: IRoomSolve) =>
            set((state) => {
              state.updateLatestSolve(newSolve);
              // handle local solve status update - everyone's solve status will update later
              state.resetLocalSolveStatus();
              const updatedUsers = { ...state.users };
              for (const roomUser of Object.values(updatedUsers)) {
                roomUser.currentResult = undefined;
                roomUser.solveStatus = "IDLE";
              }
              // clear live times
              state.clearUserLiveStartTimes();
              state.clearUserLiveTimes();
              // the only update we make in this function is to users
              return { users: updatedUsers };
            }),

          finishSolve: (
            solve: IRoomSolve,
            participants: Record<string, IRoomParticipant>
          ) =>
            set((state) => {
              const updatedMatch = { ...state.match };
              const currentSolve = getLatestSolve(updatedMatch);
              const currentSet = getLatestSet(updatedMatch);
              if (!currentSolve || currentSet!.solves.length === 0) return {};

              updatedMatch.sets.at(-1)!.solves[
                updatedMatch.sets.at(-1)!.solves.length - 1
              ] = solve;

              //update points for ALL users - nec. for Ao, Mo modes
              const updatedParticipants = state.teamSettings.teamsEnabled
                ? { ...get().teams }
                : { ...get().users };
              for (const [pid, participant] of Object.entries(participants)) {
                updatedParticipants[pid].points = participant.points;
              }
              return {
                match: updatedMatch,
                ...(state.teamSettings.teamsEnabled
                  ? { teams: updatedParticipants as Record<string, IRoomTeam> }
                  : {
                      users: updatedParticipants as Record<string, IRoomUser>,
                    }),
              };
            }),
          finishSet: (setWinners: string[]) =>
            set((state) => {
              //update set wins for set winners by 1
              const teamsEnabled = state.teamSettings.teamsEnabled;
              const updatedParticipants = teamsEnabled
                ? { ...state.teams }
                : { ...state.users };
              const participantIds = Object.keys(updatedParticipants);
              const updatedMatch = { ...state.match };
              const latestSet = getLatestSet(updatedMatch);
              if (!latestSet) return {};
              latestSet.finished = true;
              latestSet.winners.push(...setWinners);
              for (const pid of participantIds) {
                // const participant = updatedParticipants[pid]!;
                updatedParticipants[pid].points = 0;
              }
              for (const pid of setWinners) {
                // const participant = updatedParticipants[pid]!;
                updatedParticipants[pid].setWins += 1;
              }
              if (teamsEnabled) {
                return {
                  teams: updatedParticipants as Record<string, IRoomTeam>,
                  match: updatedMatch,
                };
              } else {
                return {
                  users: updatedParticipants as Record<string, IRoomUser>,
                  match: updatedMatch,
                };
              }
            }),
          finishMatch: (matchWinners: string[]) =>
            set((state) => {
              return {
                match: { ...state.match, winners: matchWinners },
                roomState: "FINISHED",
              };
            }),
          updateSolveStatus: (userId: string, newStatus: SolveStatus) =>
            set((state) => {
              const updatedUsers: Record<string, IRoomUser> = {
                ...state.users,
              };
              if (!updatedUsers[userId]) return {};
              updatedUsers[userId].solveStatus = newStatus;
              return { users: updatedUsers };
            }),
          userToggleCompeting: (userId: string, newCompeting: boolean) =>
            set((state) => {
              const updatedUsers: Record<string, IRoomUser> = {
                ...state.users,
              };
              if (
                !updatedUsers[userId] ||
                updatedUsers[userId].competing === newCompeting
              ) {
                return {};
              }
              updatedUsers[userId].competing = newCompeting;
              return { users: updatedUsers };
            }),
          userJoin: (user: IRoomUser) =>
            set((state) => {
              const updatedUsers: Record<string, IRoomUser> = {
                ...state.users,
              };
              if (updatedUsers[user.user.id]) {
                // user rejoining - just set active to true
                updatedUsers[user.user.id].active = true;
              } else {
                // user first join - add whole IRoomUser object
                updatedUsers[user.user.id] = user;
              }
              return { users: updatedUsers };
            }),
          userUpdate: (user: IRoomUser) =>
            set((state) => {
              const updatedUsers: Record<string, IRoomUser> = {
                ...state.users,
              };
              updatedUsers[user.user.id] = user;
              return { users: updatedUsers };
            }),
          userBanned: (userId: string) =>
            set((state) => {
              const updatedUsers: Record<string, IRoomUser> = {
                ...state.users,
              };
              if (updatedUsers[userId]) {
                updatedUsers[userId].banned = true;
                return { users: updatedUsers };
              } else {
                return {};
              }
            }),
          userUnbanned: (userId: string) =>
            set((state) => {
              const updatedUsers: Record<string, IRoomUser> = {
                ...state.users,
              };
              if (updatedUsers[userId]) {
                updatedUsers[userId].banned = false;
                return { users: updatedUsers };
              } else {
                return {};
              }
            }),
          createTeams: (teams: IRoomTeam[]) =>
            set((state) => {
              if (!state.teamSettings.teamsEnabled) {
                return {};
              }
              const updatedTeams: Record<string, IRoomTeam> = {
                ...state.teams,
              };
              for (const team of teams) {
                updatedTeams[team.team.id] = team;
              }
              return { teams: updatedTeams };
            }),
          deleteTeam: (teamId: string) =>
            set((state) => {
              if (!state.teamSettings.teamsEnabled) {
                return {};
              }
              const updatedTeams: Record<string, IRoomTeam> = {
                ...state.teams,
              };
              delete updatedTeams[teamId];
              return { teams: updatedTeams };
            }),
          userJoinTeam: (
            user: IRoomUser,
            team: IRoomTeam,
            extraData: {
              attempt: IAttempt | undefined;
              resetTeamResult: boolean;
            }
          ) =>
            set((state) => {
              if (!state.teamSettings.teamsEnabled) {
                return {};
              }
              const updatedTeams: Record<string, IRoomTeam> = {
                ...state.teams,
              };
              const updatedUsers: Record<string, IRoomUser> = {
                ...state.users,
              };
              //if user belonged to another team, remove them
              updatedUsers[user.user.id] = user;
              updatedTeams[team.team.id] = team;
              // if new scramble exists, add it
              const updatedMatch = { ...state.match };
              const currentSolve = getLatestSolve(updatedMatch);
              if (currentSolve) {
                if (extraData.attempt) {
                  if (
                    !(
                      extraData.attempt.scramble in currentSolve.solve.scrambles
                    )
                  ) {
                    currentSolve.solve.scrambles.push(
                      extraData.attempt.scramble
                    );
                  }
                  currentSolve.solve.attempts[user.user.id] = extraData.attempt;
                }

                if (extraData.resetTeamResult) {
                  delete currentSolve.solve.results[team.team.id];
                }
              }
              return {
                users: updatedUsers,
                teams: updatedTeams,
                match: updatedMatch,
              };
            }),
          userLeaveTeam: (user: IRoomUser, team: IRoomTeam) =>
            set((state) => {
              if (!state.teamSettings.teamsEnabled) {
                return {};
              }
              const updatedTeams: Record<string, IRoomTeam> = {
                ...state.teams,
              };
              const updatedUsers: Record<string, IRoomUser> = {
                ...state.users,
              };
              updatedUsers[user.user.id] = user;
              updatedTeams[team.team.id] = team;
              const updatedMatch = { ...state.match };
              const currentSolve = getLatestSolve(updatedMatch);
              if (currentSolve) {
                /**
                 * Note: this is technically wrong in isolation (don't necessarily need to delete the team's result), but backend currently corrects this with a new result event if applicable
                 */
                //remove the attempt and team result
                delete currentSolve.solve.attempts[user.user.id];
                delete currentSolve.solve.results[team.team.id];
              }
              return {
                users: updatedUsers,
                teams: updatedTeams,
                match: updatedMatch,
              };
            }),
          updateTeam: (team: IRoomTeam) =>
            set((state) => {
              const updatedTeams = { ...state.teams };
              updatedTeams[team.team.id] = team;
              return { teams: updatedTeams };
            }),
          updateTeams: (teams: Record<string, IRoomTeam>) =>
            set(() => ({
              teams: teams,
            })),
          startRoom: () =>
            set(() => ({
              roomState: "STARTED",
            })),
          resetRoom: () =>
            set((state) => {
              const updatedUsers = { ...state.users };
              const updatedTeams = { ...state.teams };
              for (const roomUser of Object.values(updatedUsers)) {
                roomUser.points = 0;
                roomUser.setWins = 0;
                roomUser.solveStatus = "IDLE";
                roomUser.currentResult = undefined;
              }
              for (const roomTeam of Object.values(updatedTeams)) {
                roomTeam.points = 0;
                roomTeam.setWins = 0;
                roomTeam.solveStatus = "IDLE";
                roomTeam.currentResult = undefined;
                roomTeam.currentMember = undefined;
              }
              return {
                roomState: "WAITING",
                match: {
                  sets: [],
                  winners: [],
                  finished: false,
                },
                currentSet: 0,
                currentSolve: 0,
                users: updatedUsers,
                teams: updatedTeams,
              };
            }),
          addUserResult: (userId: string, result: IResult) =>
            set((state) => {
              const updatedUsers = { ...state.users };
              const currentSolve = getLatestSolve(state.match);
              if (updatedUsers[userId] && currentSolve) {
                updatedUsers[userId].currentResult = result;
              }

              return {
                users: updatedUsers,
              };
            }),
          addResult: (participantId: string, result: IResult) =>
            set((state) => {
              const teamsEnabled = state.teamSettings.teamsEnabled;
              const updatedParticipants = teamsEnabled
                ? { ...state.teams }
                : { ...state.users };
              // const updatedSolves = [...state.solves];
              const updatedMatch = { ...state.match };
              const currentSolve = getLatestSolve(updatedMatch);
              if (updatedParticipants[participantId] && currentSolve) {
                updatedParticipants[participantId].currentResult = result;
                currentSolve.solve.results[participantId] = result;
              }
              return {
                match: updatedMatch,
                ...(teamsEnabled
                  ? { teams: updatedParticipants as Record<string, IRoomTeam> }
                  : {
                      users: updatedParticipants as Record<string, IRoomUser>,
                    }),
              };
            }),
        };
      },
      {
        name: "btime-user-room-preferences",
        version: 0, //Increment number upon making breaking change. This will invalidate (and rmeove) the old version on client
        partialize: (state) => ({
          timerType: state.timerType,
          useInspection: state.useInspection,
          drawScramble: state.drawScramble,
        }),
        migrate: () => {
          return {};
        },
      }
    )
  );
}
