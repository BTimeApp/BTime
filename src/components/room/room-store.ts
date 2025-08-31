import {
  IRoom,
  MatchFormat,
  RoomEvent,
  RoomFormat,
  SetFormat,
} from "@/types/room";
import { IRoomSolve } from "@/types/room-solve";
import { IRoomUser } from "@/types/room-user";
import { RoomState } from "@/types/room";
import { StoreApi, createStore } from "zustand";
import { TimerType } from "@/types/timer-type";
import { Penalty, Result } from "@/types/result";
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
  roomWinners: string[];
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
  userLiveTimerStartTimes: Map<string, number>;
  userLiveTimes: Map<string, number>;

  setLocalPenalty: (penalty: Penalty) => void;
  setLocalResult: (result: Result) => void;
  setRoomName: (roomName: string) => void;
  setHostId: (hostId: string) => void;
  setLiveTimerStartTime: (time: number) => void;

  setUseInspection: (useInspection: boolean) => void;
  setTimerType: (timerType: TimerType) => void;
  setDrawScramble: (drawScramble: boolean) => void;

  isUserHost: (userId: string) => boolean;
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

    userLiveTimerStartTimes: new Map<string, number>(),
    userLiveTimes: new Map<string, number>(),

    setLocalPenalty: (penalty: Penalty) =>
      set(() => ({ localPenalty: penalty })),
    setLocalResult: (result: Result) => set(() => ({ localResult: result })),
    setRoomName: (roomName: string) => set(() => ({ roomName: roomName })),
    setHostId: (hostId: string) => set(() => ({ hostId: hostId })),
    setLiveTimerStartTime: (time: number) =>
      set(() => ({ liveTimerStartTime: time })),
    isUserHost: (userId: string) => {
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
          if (get().useInspection && get().timerType === "KEYBOARD") {
            //inspection only works with keyboard timer
            set(() => ({ localSolveStatus: "INSPECTING" }));
          } else {
            set(() => ({ localSolveStatus: "SOLVING" }));
          }
          break;
        case "INSPECTING":
          set(() => ({ localSolveStatus: "SOLVING" }));
          break;
        case "SOLVING":
          set(() => ({ localSolveStatus: "SUBMITTING" }));
          break;
        case "SUBMITTING":
          if (event === "SUBMIT_TIME") {
            set(() => ({ localSolveStatus: "FINISHED" }));
          } else if (event === "REDO_SOLVE") {
            if (get().useInspection && get().timerType === "KEYBOARD") {
              set(() => ({ localSolveStatus: "INSPECTING" }));
            } else {
              set(() => ({ localSolveStatus: "SOLVING" }));
            }
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
      set(() => ({
        userLiveTimerStartTimes: new Map<string, number>(
          get().userLiveTimerStartTimes
        ).set(userId, time),
      })),

    clearUserLiveStartTimes: () =>
      set(() => ({ userLiveTimerStartTimes: new Map<string, number>() })),

    addUserLiveStopTime: (userId: string, time: number) => {
      const startTime = get().userLiveTimerStartTimes.get(userId);
      if (startTime === undefined) return;

      set(() => ({
        userLiveTimerStartTimes: new Map<string, number>(
          get().userLiveTimerStartTimes.entries().filter(x => x[0] !== userId)
        ),
        userLiveTimes: new Map<string, number>(
          get().userLiveTimes
        ).set(userId, time - startTime),
      }))
    },

    clearUserLiveTimes: () =>
      set(() => ({ userLiveTimes: new Map<string, number>() })),

    handleRoomUpdate: (room: IRoom) =>
      set(() => ({
        roomName: room.roomName,
        users: room.users,
        hostId: room.host ? room.host.id : "",
        solves: room.solves,
        currentSet: room.currentSet,
        currentSolve: room.currentSolve,
        roomEvent: room.roomEvent,
        roomFormat: room.roomFormat,
        matchFormat: room.matchFormat ?? "BEST_OF",
        setFormat: room.setFormat ?? "BEST_OF",
        nSolves: room.nSolves ?? 1,
        nSets: room.nSets ?? 1,
        roomState: room.state,
        roomWinners: room.winners || [],
        isPrivate: room.isPrivate,
      })),
  }));
