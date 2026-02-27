import type {
  BluetoothCube,
  CubeMoveEventListener,
  CubeOrientationEventListener,
  CubeStateEventListener,
  MoveEvent,
  OrientationEvent,
  Quaternion,
  StateEvent,
} from "@btime/bluetooth-cubing";
import type { KPattern } from "cubing/kpuzzle";

import { connectCube, IDENTITY_QUATERNION } from "@btime/bluetooth-cubing";
import { createStore, useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

/**
 * A zustand store to persistently keep track of a smart timer and use helpful related state.
 * This is essentially a re-write of the useSmartTimer() hook from the bluetooth lib, but as a zustand store.
 */
export interface BluetoothCubeStore {
  connected: boolean;
  cube: BluetoothCube | null;
  orientation: Quaternion;
  initialState: KPattern | undefined;
  initialStateInitialized: boolean; //TODO - see if this is strictly necessary - may get away with leaving state undefined

  moveCallbackRef: {
    current: CubeMoveEventListener | null;
  };
  orientationCallbackRef: {
    current: CubeOrientationEventListener | null;
  };
  stateCallbackRef: {
    current: CubeStateEventListener | null;
  };

  disconnectCallbackRef: {
    current: ((event: Event) => void) | null;
  };

  connect: (
    onConnect?: () => void,
    onError?: (err: Error) => void
  ) => Promise<void>;
  sync: () => Promise<void>;
  disconnect: () => Promise<void>;
}

/**
 * A singleton bluetooth cube store instance.
 * If we need multiple concurrent bluetooth connections in the future,
 * we can expand this to the StoreApi pattern in room store.
 */
const BluetoothCubeStore = createStore<BluetoothCubeStore>((set, get) => ({
  // connection: null,
  connected: false,
  cube: null,
  orientation: IDENTITY_QUATERNION,
  initialState: undefined,
  initialStateInitialized: false,

  moveCallbackRef: {
    current: null,
  },

  orientationCallbackRef: {
    current: null,
  },

  stateCallbackRef: {
    current: null,
  },

  solvedCallbackRef: {
    current: null,
  },

  disconnectCallbackRef: {
    current: null,
  },

  connect: async (onConnect?: () => void, onError?: (err: Error) => void) => {
    try {
      if (get().cube && get().connected) {
        return;
      }

      const cube = await connectCube();

      //(initial) state
      cube.onStateEvent((event: StateEvent) => {
        // TODO - figure out if this belongs up here or at end
        get().stateCallbackRef.current?.(event);

        if (!get().initialStateInitialized) {
          set({
            initialState: event.kpattern,
            initialStateInitialized: true,
          });
        }
      });

      //move
      cube.onMoveEvent((event: MoveEvent) => {
        // only accept and emit move events if state is initialized
        if (get().initialStateInitialized) {
          get().moveCallbackRef.current?.(event);
        }
      });

      //orientation
      cube.onOrientationEvent((event: OrientationEvent) => {
        // TODO - figure out how to handle high-frequency events - see use-bluetooth-cube
        get().orientationCallbackRef.current?.(event);

        set({
          orientation: event.quaternion,
        });
      });

      //disconnect
      cube.onDisconnectEvent((event: Event) => {
        set({
          cube: null,
          connected: false,
          initialState: undefined,
          initialStateInitialized: false,
        });

        get().disconnectCallbackRef.current?.(event);
      });

      set({
        cube: cube,
        connected: true,
      });

      await cube.sync();

      onConnect?.();
    } catch (err) {
      onError?.(err as Error);
    }
  },

  sync: async () => {
    set({
      initialState: undefined,
      initialStateInitialized: false,
    });

    await get().cube?.sync();
  },

  disconnect: async () => {
    //send disconnect msg
    await get().cube?.disconnect();

    set({
      cube: null,
      connected: false,
      initialState: undefined,
      initialStateInitialized: false,
    });
  },
}));

// hook for piecewise access + free useShallow
export function useBluetoothCubeStore<T>(
  selector: (state: BluetoothCubeStore) => T
): T {
  return useStore(BluetoothCubeStore, useShallow(selector));
}
