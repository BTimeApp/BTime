import {
  Access,
  IRoom,
  RaceSettings,
  RoomEvent,
  TeamSettings,
} from "@/types/room";
import { IRoomSolve } from "@/types/room-solve";
import {
  IRoomParticipant,
  IRoomTeam,
  IRoomUser,
} from "@/types/room-participant";
import { RoomState } from "@/types/room";
import { StoreApi, createStore } from "zustand";
import { timerAllowsInspection, TimerType } from "@/types/timer-type";
import { IResult, Penalty, Result } from "@/types/result";
import { SolveStatus } from "@/types/status";

export type RoomStore = {
  // room related state
  roomName: string;
  hostId: string;
  users: Record<string, IRoomUser>;
  teams: Record<string, IRoomTeam>;
  solves: IRoomSolve[];
  currentSet: number;
  currentSolve: number;
  roomEvent: RoomEvent;
  roomState: RoomState;
  roomWinners: string[]; //user ids of all room winners
  access: Access;
  raceSettings: RaceSettings;
  teamSettings: TeamSettings;

  //local (client) states
  localPenalty: Penalty; //penalty associated with current solve
  localResult: Result; //result associated with current solve
  localSolveStatus: SolveStatus; //current solving state of client
  liveTimerStartTime: number; //the start time for the client's current solve
  isRoomValid: boolean; //is there a room with this roomid?
  isPasswordAuthenticated: boolean; //has password been accepted?

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

  setIsRoomValid: (isRoomValid: boolean) => void;
  setIsPasswordAuthenticated: (isAuthenticated: boolean) => void;

  addUserLiveStartTime: (userId: string, startTime: number) => void;
  clearUserLiveStartTimes: () => void;
  addUserLiveStopTime: (userId: string, startTime: number) => void;
  clearUserLiveTimes: () => void;

  //only handles room information - not any local user info
  handleRoomUpdate: (room: IRoom) => void;

  //update room user information from server - used when initializing the user on client side
  handleRoomUserUpdate: (roomUser: IRoomUser) => void;

  addNewSolve: (newSolve: IRoomSolve) => void;

  updateLatestSolve: (updatedSolve: IRoomSolve) => void;

  resetLatestSolve: (newSolve: IRoomSolve) => void;

  addNewSet: () => void;

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

  createTeam: (team: IRoomTeam) => void;

  deleteTeam: (teamId: string) => void;

  userJoinTeam: (
    user: IRoomUser,
    team: IRoomTeam,
    newScramble?: string
  ) => void;

  userLeaveTeam: (user: IRoomUser, team: IRoomTeam) => void;

  updateTeam: (team: IRoomTeam) => void;

  updateTeams: (teams: Record<string, IRoomTeam>) => void;

  startRoom: (solve: IRoomSolve) => void;

  resetRoom: () => void;

  addResult: (userId: string, result: IResult) => void;
};

export const createRoomStore = (): StoreApi<RoomStore> =>
  createStore<RoomStore>((set, get) => ({
    // general room state
    roomName: "",
    hostId: "",
    users: {},
    teams: {},
    solves: [],
    currentSet: 1,
    currentSolve: 0,
    roomEvent: "333",
    teamsEnabled: false,
    roomState: "WAITING",
    roomWinners: [],
    access: { visibility: "PUBLIC" },
    raceSettings: { roomFormat: "CASUAL" },
    teamSettings: { teamsEnabled: false },

    // local (client) state/options
    localPenalty: "OK",
    localResult: new Result(""),
    localSolveStatus: "IDLE",
    liveTimerStartTime: 0,
    isRoomValid: true,
    isPasswordAuthenticated: false,

    //user settings
    timerType: "KEYBOARD",
    useInspection: false,
    drawScramble: true,

    userLiveTimerStartTimes: {},
    userLiveTimes: {},

    setLocalPenalty: (penalty: Penalty) =>
      set(() => ({ localPenalty: penalty })),
    setLocalResult: (result: Result) => set(() => ({ localResult: result })),
    setRoomName: (roomName: string) => set(() => ({ roomName: roomName })),
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
          if (get().timerType === "GANTIMER" && event === "TIMER_RESET") {
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
        case "GANTIMER":
          set(() => ({ localSolveStatus: "IDLE" }));
          break;
      }
    },

    setIsRoomValid: (isRoomValid: boolean) =>
      set(() => ({ isRoomValid: isRoomValid })),
    setIsPasswordAuthenticated: (isPasswordAuthenticated: boolean) =>
      set(() => ({ isPasswordAuthenticated: isPasswordAuthenticated })),

    /**
     * We need to create an entire new Map here to adhere to the Zustand rules
     * This shouldn't cause any big issues since we expect not to have massive rooms but TODO find a better way to handle this
     */
    addUserLiveStartTime: (userId: string, time: number) =>
      set((state) => {
        const updatedUserLiveStartTimes = { ...state.userLiveTimerStartTimes };
        updatedUserLiveStartTimes[userId] = time;
        return { userLiveTimerStartTimes: updatedUserLiveStartTimes };
      }),

    clearUserLiveStartTimes: () => set(() => ({ userLiveTimerStartTimes: {} })),

    addUserLiveStopTime: (userId: string, time: number) =>
      set((state) => {
        const startTime = get().userLiveTimerStartTimes[userId];
        if (startTime === undefined) return {};

        const updatedUserLiveStartTimes = { ...state.userLiveTimerStartTimes };
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
        solves: room.solves,
        currentSet: room.currentSet,
        currentSolve: room.currentSolve,
        roomEvent: room.settings.roomEvent,
        raceSettings: room.settings.raceSettings,
        teamSettings: room.settings.teamSettings,
        roomState: room.state,
        roomWinners: room.winners || [],
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

    addNewSolve: (newSolve: IRoomSolve) =>
      set(() => {
        const updatedParticipants = get().teamSettings.teamsEnabled
          ? { ...get().teams }
          : { ...get().users };

        for (const participant of Object.values(updatedParticipants)) {
          participant.currentResult = undefined;
        }
        //TODO - in ONE mode, update the currentMember of each team

        return {
          solves: [...get().solves, newSolve],
          currentSolve: get().currentSolve + 1,
          ...(get().teamSettings.teamsEnabled
            ? { teams: updatedParticipants as Record<string, IRoomTeam> }
            : { users: updatedParticipants as Record<string, IRoomUser> }),
        };
      }),

    updateLatestSolve: (updatedSolve: IRoomSolve) =>
      set((state) => {
        const updated = [...state.solves];
        updated[updated.length - 1] = updatedSolve;
        return { solves: updated };
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

    addNewSet: () =>
      set((state) => ({
        currentSet: state.currentSet + 1,
        currentSolve: 0,
      })),

    finishSolve: (
      solve: IRoomSolve,
      participants: Record<string, IRoomParticipant>
    ) =>
      set((state) => {
        const updated = [...state.solves];
        updated[updated.length - 1] = solve;

        //update points for ALL users - nec. for Ao, Mo modes
        const updatedParticipants = state.teamSettings.teamsEnabled
          ? { ...get().teams }
          : { ...get().users };
        for (const [pid, participant] of Object.entries(participants)) {
          updatedParticipants[pid].points = participant.points;
        }

        return {
          solves: updated,
          ...(state.teamSettings.teamsEnabled
            ? { teams: updatedParticipants as Record<string, IRoomTeam> }
            : { users: updatedParticipants as Record<string, IRoomUser> }),
        };
      }),

    finishSet: (setWinners: string[]) =>
      set((state) => {
        //update set wins for set winners by 1

        const teamsEnabled = get().teamSettings.teamsEnabled;
        const updatedParticipants = teamsEnabled
          ? { ...state.teams }
          : { ...state.users };
        const participantIds = Object.keys(updatedParticipants);

        for (const pid of participantIds) {
          // const participant = updatedParticipants[pid]!;
          updatedParticipants[pid].points = 0;
        }
        for (const pid of setWinners) {
          // const participant = updatedParticipants[pid]!;
          updatedParticipants[pid].setWins += 1;
        }

        if (teamsEnabled) {
          return { teams: updatedParticipants as Record<string, IRoomTeam> };
        } else {
          return { users: updatedParticipants as Record<string, IRoomUser> };
        }
      }),

    finishMatch: (matchWinners: string[]) =>
      set(() => {
        return { roomWinners: matchWinners, roomState: "FINISHED" };
      }),

    updateSolveStatus: (userId: string, newStatus: SolveStatus) =>
      set((state) => {
        const updatedUsers: Record<string, IRoomUser> = { ...state.users };
        if (!updatedUsers[userId]) return {};
        updatedUsers[userId].solveStatus = newStatus;
        return { users: updatedUsers };
      }),

    userToggleCompeting: (userId: string, newCompeting: boolean) =>
      set((state) => {
        const updatedUsers: Record<string, IRoomUser> = { ...state.users };
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
        const updatedUsers: Record<string, IRoomUser> = { ...state.users };
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
        const updatedUsers: Record<string, IRoomUser> = { ...state.users };
        updatedUsers[user.user.id] = user;
        return { users: updatedUsers };
      }),

    userBanned: (userId: string) =>
      set((state) => {
        const updatedUsers: Record<string, IRoomUser> = { ...state.users };
        if (updatedUsers[userId]) {
          updatedUsers[userId].banned = true;
          return { users: updatedUsers };
        } else {
          return {};
        }
      }),

    userUnbanned: (userId: string) =>
      set((state) => {
        const updatedUsers: Record<string, IRoomUser> = { ...state.users };
        if (updatedUsers[userId]) {
          updatedUsers[userId].banned = false;
          return { users: updatedUsers };
        } else {
          return {};
        }
      }),

    createTeam: (team: IRoomTeam) =>
      set((state) => {
        if (!state.teamSettings.teamsEnabled) {
          return {};
        }
        const updatedTeams: Record<string, IRoomTeam> = { ...state.teams };
        updatedTeams[team.team.id] = team;
        return { teams: updatedTeams };
      }),

    deleteTeam: (teamId: string) =>
      set((state) => {
        if (!state.teamSettings.teamsEnabled) {
          return {};
        }
        const updatedTeams: Record<string, IRoomTeam> = { ...state.teams };
        delete updatedTeams[teamId];
        return { teams: updatedTeams };
      }),

    userJoinTeam: (user: IRoomUser, team: IRoomTeam, newScramble?: string) =>
      set((state) => {
        if (!state.teamSettings.teamsEnabled) {
          return {};
        }
        const updatedTeams: Record<string, IRoomTeam> = { ...state.teams };
        const updatedUsers: Record<string, IRoomUser> = { ...state.users };

        //if user belonged to another team, remove them

        updatedUsers[user.user.id] = user;
        updatedTeams[team.team.id] = team;

        // if new scramble exists, add it
        const updatedSolves = [...state.solves];
        if (updatedSolves.length > 0 && newScramble) {
          const latestSolve = updatedSolves.at(-1)!;
          latestSolve.solve.scrambles.push(newScramble);
          latestSolve.solve.attempts[user.user.id] = {
            scramble: newScramble,
            finished: false,
          };
        }

        return {
          users: updatedUsers,
          teams: updatedTeams,
          ...(newScramble ? { solves: updatedSolves } : {}),
        };
      }),

    userLeaveTeam: (user: IRoomUser, team: IRoomTeam) =>
      set((state) => {
        if (!state.teamSettings.teamsEnabled) {
          return {};
        }
        const updatedTeams: Record<string, IRoomTeam> = { ...state.teams };
        const updatedUsers: Record<string, IRoomUser> = { ...state.users };

        updatedUsers[user.user.id] = user;
        updatedTeams[team.team.id] = team;

        return { users: updatedUsers, teams: updatedTeams };
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
        solves: [],
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
          solves: [],
          currentSet: 1,
          currentSolve: 0,
          winners: state.raceSettings.roomFormat == "RACING" ? [] : undefined,
          users: updatedUsers,
          teams: updatedTeams,
        };
      }),

    addResult: (userId: string, result: IResult) =>
      set((state) => {
        const updatedUsers = { ...state.users };
        const updatedSolves = [...state.solves];
        if (updatedUsers[userId] && updatedSolves.length > 0) {
          updatedUsers[userId].currentResult = result;
          updatedSolves.at(-1)!.solve.results[userId] = result;
        }
        return {
          users: updatedUsers,
          solves: updatedSolves,
        };
      }),
  }));
