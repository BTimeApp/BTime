export const TIMER_TYPES = ["TYPING", "KEYBOARD", "BLUETOOTH"] as const; //TODO: implement STACKMAT
export type TimerType = (typeof TIMER_TYPES)[number];
