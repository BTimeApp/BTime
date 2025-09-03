export const TIMER_TYPES = ["TYPING", "KEYBOARD", "GANTIMER"] as const; //TODO: implement KEYBOARD, STACKMAT, BLUETOOTH
export type TimerType = (typeof TIMER_TYPES)[number];

export function isLiveTimer(t: TimerType) {
  return t !== "TYPING";
}

export function timerAllowsInspection(t: TimerType) {
  return t !== "TYPING";
}
