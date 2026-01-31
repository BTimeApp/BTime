// time in milliseconds

/**
 * Generic timer state. Directly from GanTimerState in the gan-web-bluetooth package (by afedotov)
 */
export enum TimerState {
  /** Fired when timer is disconnected from bluetooth */
  DISCONNECT = 0,
  /** Grace delay is expired and timer is ready to start */
  GET_SET = 1,
  /** Hands removed from the timer before grace delay expired */
  HANDS_OFF = 2,
  /** Timer is running */
  RUNNING = 3,
  /** Timer is stopped, this event includes recorded time */
  STOPPED = 4,
  /** Timer is reset and idle */
  IDLE = 5,
  /** Hands are placed on the timer */
  HANDS_ON = 6,
  /** Timer moves to this state immediately after STOPPED */
  FINISHED = 7,
  /** For timers with an explicit inspection mode, like Qiyi */
  INSPECTION = 8,
}

export type TimerEvent = {
  state: TimerState;
  recordedTime?: number;
};

export type TimerStateEventListener = (event: TimerEvent) => void;
