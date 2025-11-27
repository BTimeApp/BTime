import { createStore, useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  connectGanTimer,
  GanTimerConnection,
  GanTimerState,
} from "gan-web-bluetooth";

export interface GanTimerStore {
  //   Connection state
  connection: GanTimerConnection | null;
  connected: boolean;
  timerState: GanTimerState | null;
  previousDisplayTimeMS: number;

  // Actions
  connect: (
    onConnect?: (connection: GanTimerConnection) => void,
    onError?: (err: Error) => void
  ) => Promise<void>;
  setTimerState: (state: GanTimerState) => void;
  getCurrentDisplayTimeMS: () => Promise<number>;
  setPreviousDisplayTimeMS: (prevDisplayTimeMS: number) => void;
  disconnect: () => void;
}

/**
 * A singleton bluetooth store instance.
 * If we need multiple concurrent bluetooth connections in the future,
 * we can expand this to the StoreApi pattern in room store.
 */
const GanTimerStore = createStore<GanTimerStore>((set, get) => ({
  connection: null,
  connected: false,
  timerState: null,
  previousDisplayTimeMS: 0,

  connect: async (
    onConnect?: (connection: GanTimerConnection) => void,
    onError?: (err: Error) => void
  ) => {
    try {
      const conn = await connectGanTimer();
      const prevDisplayTimeMS = (await conn.getRecordedTimes()).displayTime
        .asTimestamp;
      set(() => ({
        connection: conn,
        connected: true,
        timerState: GanTimerState.IDLE,
        previousDisplayTimeMS: prevDisplayTimeMS,
      }));

      onConnect?.(conn);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  },

  setTimerState: (state: GanTimerState) =>
    set({
      timerState: state,
    }),

  getCurrentDisplayTimeMS: async () => {
    const conn = get().connection;
    return conn ? (await conn.getRecordedTimes()).displayTime.asTimestamp : 0;
  },

  setPreviousDisplayTimeMS: (prevDisplayTimeMS: number) =>
    set({
      previousDisplayTimeMS: prevDisplayTimeMS,
    }),

  disconnect: () => {
    //send disconnect msg
    get().connection?.disconnect();

    set(() => ({
      connection: null,
      connected: false,
      timerState: null,
      previousDisplayTimeMS: 0
    }));
  },
}));

// hook for piecewise access + free useShallow
export function useGanTimerStore<T>(selector: (state: GanTimerStore) => T): T {
  return useStore(GanTimerStore, useShallow(selector));
}
