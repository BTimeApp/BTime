import {
  ROOM_EVENTS_INFO,
  type RoomEvent,
  type SolveStatus,
  type TimerType,
} from "@btime/types";

/**
 * TODO - consider rolling all of these up into options on some TimerTypeInfo constant
 */

export function isLiveTimer(t: TimerType) {
  return t !== "TYPING";
}

export function timerAllowsInspection(t: TimerType) {
  return t !== "TYPING";
}

/**
 * Helper function to provide the default local solve status based on timer type.
 */
export function getDefaultLocalSolveStatus(timerType: TimerType): SolveStatus {
  switch (timerType) {
    case "TYPING":
      return "SOLVING";
    case "KEYBOARD":
      return "IDLE";
    case "BLUETOOTHTIMER":
      return "IDLE";
    case "VIRTUAL":
      return "IDLE";
    case "BLUETOOTHCUBE":
      return "IDLE";
    default:
      console.error(`Illegal timer type encountered: ${timerType}`);
      return "IDLE";
  }
}

/**
 * Helper function to know if a timer type allows an event.
 * We need this function b/c virtual cube, bluetooth cube timer types only support 333 puzzles
 */
export function timerAllowsEvent(timerType: TimerType, roomEvent: RoomEvent) {
  switch (timerType) {
    case "TYPING":
      return true;
    case "KEYBOARD":
      return true;
    case "BLUETOOTHTIMER":
      return true;
    case "VIRTUAL":
      // replace this when virtual supports more puzzles
      return roomEvent === "333";
    case "BLUETOOTHCUBE":
      return ROOM_EVENTS_INFO[roomEvent]?.baseEvent === "333";
    default:
      console.error(`Illegal timer type encountered: ${timerType}`);
      return "IDLE";
  }
}
