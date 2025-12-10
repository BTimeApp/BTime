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
import {
  getDefaultLocalSolveStatus,
  timerAllowsInspection,
  TimerType,
} from "@/types/timer-type";
import { IResult, Penalty, Result } from "@/types/result";
import { SolveStatus } from "@/types/status";
import { IAttempt } from "@/types/solve";
import { immer } from "zustand/middleware/immer";
import { Draft } from "immer";

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

  /**
   * Meant to set up local user state based on some external store (in our case, the backend).
   * Should only be used for setup, never as a reactive update
   */
  setUpLocalUserState: (roomUser: IRoomUser) => void;

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

export function createRoomStore() {
  return create<RoomStore>()(
    persist(
      immer((set, get) => {
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

          //user settings
          timerType: "KEYBOARD",
          useInspection: false,
          drawScramble: true,

          // local (client) state/options
          localPenalty: "OK",
          localResult: new Result(""),
          localSolveStatus: "IDLE",
          liveTimerStartTime: 0,

          userLiveTimerStartTimes: {},
          userLiveTimes: {},
          setLocalPenalty: (penalty: Penalty) =>
            set((state) => {
              state.localPenalty = penalty;
            }),
          setLocalResult: (result: Result) =>
            set((state) => {
              state.localResult = result;
            }),
          setRoomName: (roomName: string) =>
            set((state) => {
              state.roomName = roomName;
            }),
          setHostId: (hostId: string) =>
            set((state) => {
              state.hostId = hostId;
            }),
          setLiveTimerStartTime: (time: number) =>
            set((state) => {
              state.liveTimerStartTime = time;
            }),
          isUserHost: (userId: string | undefined) => {
            if (userId === undefined) return false;
            const hostId = get().hostId;
            return userId === hostId;
          },
          setUseInspection: (useInspection: boolean) =>
            set((state) => {
              state.useInspection = useInspection;
            }),
          setTimerType: (timerType: TimerType) => {
            if (get().timerType != timerType) {
              set((state) => {
                state.timerType = timerType;
              });
              get().resetLocalSolveStatus();
            }
          },
          setDrawScramble: (drawScramble: boolean) =>
            set((state) => {
              state.drawScramble = drawScramble;
            }),
          /**
           * Handles all state transitions for local SolveStatus.
           */
          updateLocalSolveStatus: (event?: string) => {
            switch (get().localSolveStatus) {
              case "IDLE":
                if (
                  get().useInspection &&
                  timerAllowsInspection(get().timerType) &&
                  event !== "TIMER_START"
                ) {
                  set((state) => {
                    state.localSolveStatus = "INSPECTING";
                  });
                } else {
                  if (get().timerType === "TYPING") {
                    set((state) => {
                      state.localSolveStatus = "SUBMITTING";
                    });
                  } else {
                    set((state) => {
                      state.localSolveStatus = "SOLVING";
                    });
                  }
                }
                break;
              case "INSPECTING":
                if (
                  get().timerType === "BLUETOOTH" &&
                  event === "TIMER_RESET"
                ) {
                  set((state) => {
                    state.localSolveStatus = "IDLE";
                  });
                } else {
                  set((state) => {
                    state.localSolveStatus = "SOLVING";
                  });
                }
                break;
              case "SOLVING":
                set((state) => {
                  state.localSolveStatus = "SUBMITTING";
                });
                break;
              case "SUBMITTING":
                if (event === "SUBMIT_TIME") {
                  set((state) => {
                    state.localSolveStatus = "FINISHED";
                  });
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
            const defaultSolveStatus = getDefaultLocalSolveStatus(
              get().timerType
            );
            set((state) => {
              state.localSolveStatus = defaultSolveStatus;
            });
          },
          resetLocalSolve: () => {
            get().resetLocalSolveStatus();
            get().setLocalResult(new Result(""));
            get().setLocalPenalty("OK");
          },

          addUserLiveStartTime: (userId: string, time: number) =>
            set((state) => {
              state.userLiveTimerStartTimes[userId] = time;
            }),
          clearUserLiveStartTimes: () =>
            set((state) => {
              state.userLiveTimerStartTimes = {};
            }),
          addUserLiveStopTime: (userId: string, time: number) =>
            set((state) => {
              const startTime = state.userLiveTimerStartTimes[userId];
              if (startTime === undefined) return;
              delete state.userLiveTimerStartTimes[userId];
              state.userLiveTimes[userId] = time - startTime;
            }),
          clearUserLiveTimes: () =>
            set((state) => {
              state.userLiveTimes = {};
            }),
          handleRoomUpdate: (room: IRoom) =>
            set((state) => {
              state.roomName = room.settings.roomName;
              state.users = room.users;
              state.teams = room.teams;
              state.hostId = room.host ? room.host.id : "";
              state.match = room.match;
              state.currentSet = room.currentSet;
              state.currentSolve = room.currentSolve;
              state.roomEvent = room.settings.roomEvent;
              state.raceSettings = room.settings.raceSettings;
              state.teamSettings = room.settings.teamSettings;
              state.maxUsers = room.settings.maxUsers;
              state.roomState = room.state;
              state.access = room.settings.access;
            }),

          setUpLocalUserState: (roomUser: IRoomUser) => {
            /**
             * Set the local solve status to default, which depends on timer type.
             * We will only set to FINISHED if the remote store says we already have a current result.
             */
            get().resetLocalSolveStatus();
            set((state) => {
              state.localPenalty = roomUser.currentResult?.penalty ?? "OK";
              state.localResult = roomUser.currentResult
                ? Result.fromIResult(roomUser.currentResult)
                : new Result("");
              if (roomUser.currentResult) {
                state.localSolveStatus = "FINISHED";
              }
            });
          },
          createAttempt: (userId: string, attempt: IAttempt) =>
            set((state) => {
              const currentSolve = getLatestSolve(state.match);
              if (!currentSolve) {
                return;
              }
              currentSolve.solve.attempts[userId] = attempt;
            }),
          deleteAttempt: (userId: string) =>
            set((state) => {
              const currentSolve = getLatestSolve(state.match);
              if (!currentSolve) {
                return;
              }
              delete currentSolve.solve.attempts[userId];
            }),
          addNewSolve: (newSolve: IRoomSolve) =>
            set((state: Draft<RoomStore>) => {
              const currentSet = getLatestSet(state.match);
              if (!currentSet) return;

              const { teamsEnabled } = state.teamSettings;
              const participants = teamsEnabled ? state.teams : state.users;

              for (const participant of Object.values(participants)) {
                participant.currentResult = undefined;
              }

              currentSet.solves.push(newSolve);
              state.currentSolve += 1;
            }),
          addNewSet: (newSet: IRoomSet) =>
            set((state) => {
              state.match.sets.push(newSet);
              state.currentSet += 1;
              state.currentSolve = 0;
            }),

          updateLatestSolve: (updatedSolve: IRoomSolve) =>
            set((state) => {
              const latestSet = getLatestSet(state.match);
              if (
                !getLatestSolve(state.match) ||
                !latestSet ||
                getLatestSet(state.match)!.solves.length === 0
              ) {
                return;
              }

              latestSet.solves[latestSet.solves.length - 1] = updatedSolve;
            }),

          resetLatestSolve: (newSolve: IRoomSolve) => {
            get().updateLatestSolve(newSolve);
            get().resetLocalSolveStatus();
            get().clearUserLiveStartTimes();
            get().clearUserLiveTimes();
            set((state) => {
              for (const roomUser of Object.values(state.users)) {
                roomUser.currentResult = undefined;
                roomUser.solveStatus = "IDLE";
              }
            });
          },

          finishSolve: (
            solve: IRoomSolve,
            participants: Record<string, IRoomParticipant>
          ) =>
            set((state) => {
              // const updatedMatch = { ...state.match };
              const currentSolve = getLatestSolve(state.match);
              const currentSet = getLatestSet(state.match);
              if (
                !currentSolve ||
                !currentSet ||
                currentSet!.solves.length === 0
              )
                return;

              currentSet.solves[currentSet.solves.length - 1] = solve;

              //update points for ALL users - nec. for Ao, Mo modes
              const allParticipants = state.teamSettings.teamsEnabled
                ? state.teams
                : state.users;
              for (const [pid, participant] of Object.entries(participants)) {
                allParticipants[pid].points = participant.points;
              }
            }),

          finishSet: (setWinners: string[]) =>
            set((state) => {
              //update set wins for set winners by 1
              const allParticipants = state.teamSettings.teamsEnabled
                ? state.teams
                : state.users;
              const participantIds = Object.keys(allParticipants);
              const latestSet = getLatestSet(state.match);
              if (!latestSet) return {};
              latestSet.finished = true;
              latestSet.winners.push(...setWinners);
              for (const pid of participantIds) {
                allParticipants[pid].points = 0;
              }
              for (const pid of setWinners) {
                allParticipants[pid].setWins += 1;
              }
            }),
          finishMatch: (matchWinners: string[]) =>
            set((state) => {
              state.match.winners = matchWinners;
              state.roomState = "FINISHED";
            }),
          updateSolveStatus: (userId: string, newStatus: SolveStatus) =>
            set((state) => {
              if (!state.users[userId]) return;
              state.users[userId].solveStatus = newStatus;
            }),
          userToggleCompeting: (userId: string, newCompeting: boolean) =>
            set((state) => {
              if (
                !state.users[userId] ||
                state.users[userId].competing === newCompeting
              ) {
                return;
              }
              state.users[userId].competing = newCompeting;
            }),
          userJoin: (user: IRoomUser) =>
            set((state) => {
              if (state.users[user.user.id]) {
                // user rejoining - just set active to true
                state.users[user.user.id].active = true;
              } else {
                // user first join - add whole IRoomUser object
                state.users[user.user.id] = user;
              }
            }),
          userUpdate: (user: IRoomUser) =>
            set((state) => {
              state.users[user.user.id] = user;
            }),
          userBanned: (userId: string) =>
            set((state) => {
              if (state.users[userId]) {
                state.users[userId].banned = true;
              }
            }),
          userUnbanned: (userId: string) =>
            set((state) => {
              if (state.users[userId]) {
                state.users[userId].banned = false;
              }
            }),
          createTeams: (teams: IRoomTeam[]) =>
            set((state) => {
              if (!state.teamSettings.teamsEnabled) {
                return;
              }
              for (const team of teams) {
                state.teams[team.team.id] = team;
              }
            }),
          deleteTeam: (teamId: string) =>
            set((state) => {
              if (!state.teamSettings.teamsEnabled) {
                return;
              }
              delete state.teams[teamId];
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
                return;
              }
              //if user belonged to another team, remove them
              state.users[user.user.id] = user;
              state.teams[team.team.id] = team;
              // if new scramble exists, add it
              const currentSolve = getLatestSolve(state.match);
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
            }),
          userLeaveTeam: (user: IRoomUser, team: IRoomTeam) =>
            set((state) => {
              if (!state.teamSettings.teamsEnabled) {
                return;
              }
              state.users[user.user.id] = user;
              state.teams[team.team.id] = team;
              const currentSolve = getLatestSolve(state.match);
              if (currentSolve) {
                /**
                 * Note: this is technically wrong in isolation (don't necessarily need to delete the team's result), but backend currently corrects this with a new result event if applicable
                 */
                //remove the attempt and team result
                delete currentSolve.solve.attempts[user.user.id];
                delete currentSolve.solve.results[team.team.id];
              }
            }),
          updateTeam: (team: IRoomTeam) =>
            set((state) => {
              state.teams[team.team.id] = team;
            }),
          updateTeams: (teams: Record<string, IRoomTeam>) =>
            set((state) => {
              state.teams = teams;
            }),
          startRoom: () => {
            if (get().roomState !== "STARTED") {
              set((state) => {
                state.roomState = "STARTED";
              });
              get().resetLocalSolveStatus();
            }
          },
          resetRoom: () => {
            set((state) => {
              for (const roomUser of Object.values(state.users)) {
                roomUser.points = 0;
                roomUser.setWins = 0;
                roomUser.solveStatus = "IDLE";
                roomUser.currentResult = undefined;
              }
              for (const roomTeam of Object.values(state.teams)) {
                roomTeam.points = 0;
                roomTeam.setWins = 0;
                roomTeam.solveStatus = "IDLE";
                roomTeam.currentResult = undefined;
                roomTeam.currentMember = undefined;
              }
              state.currentSet = 0;
              state.currentSolve = 0;
              state.match = { sets: [], winners: [], finished: false };
              state.roomState = "WAITING";
            });
            get().resetLocalSolveStatus();
          },
          addUserResult: (userId: string, result: IResult) =>
            set((state) => {
              const currentSolve = getLatestSolve(state.match);

              if (state.users[userId] && currentSolve) {
                state.users[userId].currentResult = result;
                currentSolve.solve.attempts[userId] = {
                  ...currentSolve.solve.attempts[userId],
                  finished: true,
                  result: result,
                };
              }
            }),
          addResult: (participantId: string, result: IResult) =>
            set((state) => {
              const teamsEnabled = state.teamSettings.teamsEnabled;
              const allParticipants = teamsEnabled ? state.teams : state.users;
              const currentSolve = getLatestSolve(state.match);
              if (allParticipants[participantId] && currentSolve) {
                allParticipants[participantId].currentResult = result;
                currentSolve.solve.results[participantId] = result;
              }
            }),
        };
      }),
      {
        name: "btime-user-room-preferences",
        //Increment number upon making breaking change. This will invalidate (and remove) the old version on client
        version: 0,
        // runs on write AND read.
        partialize: (state) => ({
          timerType: state.timerType,
          useInspection: state.useInspection,
          drawScramble: state.drawScramble,
        }),
        // runs right after reading persisted state
        onRehydrateStorage: () => (state) => {
          if (!state) return; //

          state.localSolveStatus = getDefaultLocalSolveStatus(
            state.timerType //
          );
        },
        migrate: () => {
          return {};
        },
      }
    )
  );
}
export type RoomStoreUse = ReturnType<typeof createRoomStore>;
type StoreActions<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T as T[K] extends (...args: any[]) => any ? K : never]: T[K];
};
export type RoomStoreActions = StoreActions<RoomStore>;
