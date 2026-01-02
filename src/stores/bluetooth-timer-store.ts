import {
  connectTimer,
  BluetoothTimer,
  TimerEvent,
  TimerState,
} from "@btime/bluetooth-cubing";
import { createStore, useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

export type TimerEventCallback = (evt: TimerEvent) => void;

/**
 * A zustand store to persistently keep track of a smart timer and use helpful related state.
 * This is essentially a re-write of the useSmartTimer() hook from the bluetooth lib, but as a zustand store.
 */
export interface BluetoothTimerStore {
  connected: boolean;
  timer: BluetoothTimer | null;
  timerState: TimerState;
  currentDisplayTimeMS: number;

  // set up callback ref
  eventCallbackRef: {
    current: TimerEventCallback | null;
  };

  connect: (
    onConnect?: () => void,
    onError?: (err: Error) => void
  ) => Promise<void>;
  disconnect: () => Promise<void>;
}

/**
 * A singleton bluetooth store instance.
 * If we need multiple concurrent bluetooth connections in the future,
 * we can expand this to the StoreApi pattern in room store.
 */
const BluetoothTimerStore = createStore<BluetoothTimerStore>((set, get) => ({
  // connection: null,
  connected: false,
  timer: null,
  timerState: TimerState.IDLE,
  currentDisplayTimeMS: 0,
  eventCallbackRef: { current: null },

  connect: async (onConnect?: () => void, onError?: (err: Error) => void) => {
    try {
      if (get().timer && get().connected) {
        return;
      }

      const timer = await connectTimer();
      timer.onTimerEvent((event: TimerEvent) => {
        console.log(`RECEIVED STATE ${event.state}`);
        set({
          timerState: event.state,
        });

        if (event.recordedTime)
          set({ currentDisplayTimeMS: event.recordedTime });

        if (event.state === TimerState.IDLE) set({ currentDisplayTimeMS: 0 });

        if (event.state === TimerState.DISCONNECT) {
          console.log("BLUETOOTH TIMER DISCONNECT EVENT");
          set({ timer: null, connected: false, currentDisplayTimeMS: 0 });
        }

        get().eventCallbackRef.current?.(event);
      });

      set({
        timer: timer,
        timerState: TimerState.IDLE,
        connected: true,
      });

      onConnect?.();
    } catch (err) {
      onError?.(err as Error);
    }
  },

  disconnect: async () => {
    //send disconnect msg
    await get().timer?.disconnect();

    set({
      timer: null,
      connected: false,
      timerState: TimerState.IDLE,
      currentDisplayTimeMS: 0,
    });
  },
}));

// hook for piecewise access + free useShallow
export function useBluetoothTimerStore<T>(
  selector: (state: BluetoothTimerStore) => T
): T {
  return useStore(BluetoothTimerStore, useShallow(selector));
}
