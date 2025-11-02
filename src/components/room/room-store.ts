import {
  IRoom,
  MatchFormat,
  RoomEvent,
  RoomFormat,
  SetFormat,
} from "@/types/room";
import { IRoomSolve } from "@/types/room-solve";
import { IRoomUser } from "@/types/room-participant";
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
  solves: IRoomSolve[];
  currentSet: number;
  currentSolve: number;
  roomEvent: RoomEvent;
  roomFormat: RoomFormat;
  matchFormat: MatchFormat;
  setFormat: SetFormat;
  nSets: number;
  nSolves: number;
  roomState: RoomState;
  roomWinners: string[]; //user ids of all room winners
  isPrivate: boolean;

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
  getMostRecentScramble: () => string;

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

  finishSolve: (solve: IRoomSolve, users: Record<string, IRoomUser>) => void;

  finishSet: (setWinners: string[]) => void;

  finishMatch: (matchWinners: string[]) => void;

  updateSolveStatus: (userId: string, newStatus: SolveStatus) => void;

  userToggleCompeting: (userId: string, newCompeting: boolean) => void;

  userJoin: (user: IRoomUser) => void;

  userUpdate: (user: IRoomUser) => void;

  userBanned: (userId: string) => void;

  userUnbanned: (userId: string) => void;

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
    solves: [],
    currentSet: 1,
    currentSolve: 0,
    roomEvent: "333",
    roomFormat: "CASUAL",
    matchFormat: "BEST_OF",
    setFormat: "BEST_OF",
    nSets: 1,
    nSolves: 1,
    teamsEnabled: false,
    roomState: "WAITING",
    roomWinners: [],
    isPrivate: false,

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
    getMostRecentScramble: () => {
      const solves = get().solves;
      if (!solves || solves.length === 0) {
        return "";
      }
      return solves.at(-1)!.solve.scramble;
    },

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
        hostId: room.host ? room.host.id : "",
        solves: room.solves,
        currentSet: room.currentSet,
        currentSolve: room.currentSolve,
        roomEvent: room.settings.roomEvent,
        roomFormat: room.settings.roomFormat,
        matchFormat: room.settings.matchFormat ?? "BEST_OF",
        setFormat: room.settings.setFormat ?? "BEST_OF",
        nSolves: room.settings.nSolves ?? 1,
        nSets: room.settings.nSets ?? 1,
        roomState: room.state,
        roomWinners: room.winners || [],
        isPrivate: room.settings.isPrivate,
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
        //reset every user's current result
        const updatedUsers: Record<string, IRoomUser> = {};
        for (const [userId, roomUser] of Object.entries(get().users)) {
          updatedUsers[userId] = { ...roomUser, currentResult: undefined };
        }

        return {
          solves: [...get().solves, newSolve],
          currentSolve: get().currentSolve + 1,
          users: updatedUsers,
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

    finishSolve: (solve: IRoomSolve, users: Record<string, IRoomUser>) =>
      set((state) => {
        const updated = [...state.solves];
        updated[updated.length - 1] = solve;

        //update points for ALL users - nec. for Ao, Mo modes
        const updatedUsers = { ...get().users };
        for (const roomUser of Object.values(users)) {
          updatedUsers[roomUser.user.id].points = roomUser.points;
        }

        return { solves: updated };
      }),

    finishSet: (setWinners: string[]) =>
      set((state) => {
        //update set wins for set winners by 1
        const updatedUsers: Record<string, IRoomUser> = { ...state.users };
        const allUserIds = Object.keys(state.users);
        for (const userId of allUserIds) {
          const user = updatedUsers[userId]!;
          updatedUsers[userId] = { ...user, points: 0 };
        }
        for (const userId of setWinners) {
          const user = updatedUsers[userId]!;
          updatedUsers[userId] = { ...user, setWins: user.setWins + 1 };
        }

        return {
          users: updatedUsers,
        };
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

    startRoom: () =>
      set(() => ({
        roomState: "STARTED",
        solves: [],
      })),

    resetRoom: () =>
      set((state) => {
        const updatedUsers = { ...state.users };
        for (const roomUser of Object.values(updatedUsers)) {
          roomUser.points = 0;
          roomUser.setWins = 0;
          roomUser.solveStatus = "IDLE";
          roomUser.currentResult = undefined;
        }

        return {
          roomState: "WAITING",
          solves: [],
          currentSet: 1,
          currentSolve: 0,
          winners: state.roomFormat == "RACING" ? [] : undefined,
          users: updatedUsers,
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
