import { SolveStatus } from "@/types/status";

export const TIMER_TYPES = ["TYPING", "KEYBOARD", "BLUETOOTH"] as const; //TODO: implement STACKMAT
export type TimerType = (typeof TIMER_TYPES)[number];

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
    case "BLUETOOTH":
      return "IDLE";
    default:
      console.error(`Illegal timer type encountered: ${timerType}`);
      return "IDLE";
  }
}
