export const TIMER_TYPES = ['TYPING', 'KEYBOARD'] as const; //TODO: implement KEYBOARD, STACKMAT, BLUETOOTH
export type TimerType = (typeof TIMER_TYPES)[number];