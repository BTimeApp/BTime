import type { RoomEvent } from "./room.js";
import type { SolveStatus } from "./status.js";

import { ROOM_EVENTS_INFO } from "./room.js";
import { literalKeys } from "./utils.js";

export interface TimerTypeAttributes {
  isLiveTimer: boolean;
  allowsInspection: boolean;
  defaultLocalSolveStatus: SolveStatus;
  allowsEvent: (roomEvent: RoomEvent) => boolean;
}

export type TimerType = (typeof TIMER_TYPES)[number];

const defaultAllowsEvent = () => {
  return true;
};

const allowBase333 = (roomEvent: RoomEvent) => {
  return ROOM_EVENTS_INFO[roomEvent]?.baseEvent === "333";
};

export const TIMER_TYPES_INFO = {
  TYPING: {
    isLiveTimer: false,
    allowsInspection: false,
    defaultLocalSolveStatus: "SOLVING",
    allowsEvent: defaultAllowsEvent,
  },
  KEYBOARD: {
    isLiveTimer: true,
    allowsInspection: true,
    defaultLocalSolveStatus: "IDLE",
    allowsEvent: defaultAllowsEvent,
  },
  BLUETOOTHTIMER: {
    isLiveTimer: true,
    allowsInspection: true,
    defaultLocalSolveStatus: "IDLE",
    allowsEvent: defaultAllowsEvent,
  },
  VIRTUAL: {
    isLiveTimer: true,
    allowsInspection: true,
    defaultLocalSolveStatus: "IDLE",
    allowsEvent: (roomEvent: RoomEvent) => {
      return (
        roomEvent === "333" ||
        roomEvent === "222" ||
        roomEvent === "444" ||
        roomEvent === "555"
      );
    },
  },
  BLUETOOTHCUBE: {
    isLiveTimer: true,
    allowsInspection: true,
    defaultLocalSolveStatus: "IDLE",
    allowsEvent: allowBase333,
  },
} satisfies Record<string, TimerTypeAttributes>;

export const TIMER_TYPES = literalKeys(TIMER_TYPES_INFO);
