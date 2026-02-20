export const TIMER_TYPES = [
  "TYPING",
  "KEYBOARD",
  "BLUETOOTHTIMER",
  "VIRTUAL",
  "BLUETOOTHCUBE",
] as const;
export type TimerType = (typeof TIMER_TYPES)[number];
