export const TIMER_TYPES = ["TYPING", "KEYBOARD", "BLUETOOTH"] as const; //TODO: implement STACKMAT
export type TimerType = (typeof TIMER_TYPES)[number];

export function isLiveTimer(t: TimerType) {
  return t !== "TYPING";
}

export function timerAllowsInspection(t: TimerType) {
  return t !== "TYPING";
}
