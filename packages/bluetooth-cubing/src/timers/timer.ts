export const TIMER_STATE_EVENT = "TIMER_STATE_CHANGE";

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

// time in milliseconds
export type TimeMS = number;

export type TimerEvent = {
  state: TimerState;
  recordedTime?: TimeMS;
};

export type TimerStateEventListener = (event: TimerEvent) => void;

export abstract class BluetoothTimer extends EventTarget {
  protected device!: BluetoothDevice;
  protected server!: BluetoothRemoteGATTServer;
  protected time: number = 0;
  protected state: TimerState = TimerState.IDLE;

  constructor(device: BluetoothDevice) {
    super();
    this.device = device;
    this.disconnect = this.disconnect.bind(this);
  }

  getTime() {
    return this.time;
  }

  getState() {
    return this.state;
  }

  getName() {
    return this.device?.name ?? "";
  }

  async init(): Promise<void> {
    this.server = await this.device.gatt!.connect();
    await this.setup();
    this.device.addEventListener("gattserverdisconnected", this.disconnect);
  }

  async disconnect() {
    this.device?.removeEventListener("gattserverdisconnected", this.disconnect);

    await this.onDisconnect();

    //emit a disconnect event.
    if (this.server.connected) {
      this.server.disconnect();
    }

    this.dispatchEvent(
      new CustomEvent(TIMER_STATE_EVENT, {
        detail: {
          state: TimerState.DISCONNECT,
        },
      })
    );
  }

  /** For subclasses to safely emit */
  protected updateStateEvent(event: TimerEvent) {
    this.state = event.state;
    if (event.recordedTime) this.time = event.recordedTime;

    this.dispatchEvent(
      new CustomEvent(TIMER_STATE_EVENT, {
        detail: event,
      })
    );
  }

  /**
   * To be used by the eventual consumer to attach a listener for state change events.
   * Returns a cleanup callback.
   */
  onTimerEvent(cb: TimerStateEventListener): () => void {
    const handler = (e: Event) => {
      cb((e as CustomEvent<TimerEvent>).detail);
    };

    this.addEventListener(TIMER_STATE_EVENT, handler);
    return () => this.removeEventListener(TIMER_STATE_EVENT, handler);
  }

  /**
   * All brand/model-specific logic for setting up listeners, etc should be done in this function.
   */
  protected abstract setup(): Promise<void>;

  /**
   * Any cleanup logic to run on disconnect goes in here
   */
  protected abstract onDisconnect(): Promise<void>;
}
