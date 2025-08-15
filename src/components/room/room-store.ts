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
  timerType: TimerType; //type of timer client is using
  useInspection: boolean; //is inspection on?
  isRoomValid: boolean; //is there a room with this roomid?
  isPasswordAuthenticated: boolean; //has password been accepted?

  setLocalPenalty: (penalty: Penalty) => void;
  setLocalResult: (result: Result) => void;
  setRoomName: (roomName: string) => void;
  setHostId: (hostId: string) => void;
  setLiveTimerStartTime: (time: number) => void;

  setUseInspection: (useInspection: boolean) => void;
  setTimerType: (timerType: TimerType) => void;

  isUserHost: (userId: string) => boolean;
  getMostRecentScramble: () => string;

  updateLocalSolveStatus: (event?: string) => void;
  resetLocalSolveStatus: () => void;

  setIsRoomValid: (isRoomValid: boolean) => void;
  setIsPasswordAuthenticated: (isAuthenticated: boolean) => void;

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
    timerType: "KEYBOARD",
    useInspection: false,
    isRoomValid: true,
    isPasswordAuthenticated: false,

    setLocalPenalty: (penalty: Penalty) =>
      set(() => ({ localPenalty: penalty })),
    setLocalResult: (result: Result) => set(() => ({ localResult: result })),
    setRoomName: (roomName: string) => set(() => ({ roomName: roomName })),
    setHostId: (hostId: string) => set(() => ({ hostId: hostId })),
    setLiveTimerStartTime: (time: number) => set(() => ({liveTimerStartTime: time})),
    isUserHost: (userId: string) => {
      const hostId = get().hostId;
      return userId === hostId;
    },

    setUseInspection: (useInspection: boolean) => set(() => ({useInspection: useInspection})),
    setTimerType: (timerType: TimerType) => set(() => ({timerType: timerType})),
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
