import type {
  BluetoothCube,
  CubeMoveEventListener,
  CubeOrientationEventListener,
  CubeStateEventListener,
  MoveEvent,
  OrientationEvent,
  StateEvent,
} from "@btime/bluetooth-cubing";
import type { KPattern } from "cubing/kpuzzle";

import { connectCube } from "@btime/bluetooth-cubing";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const DEFAULT_ORIENTATION = { w: 1, x: 0, y: 0, z: 0 };

export function useBluetoothCube(
  onMoveEvent?: CubeMoveEventListener,
  onStateEvent?: CubeStateEventListener,
  onOrientationEvent?: CubeOrientationEventListener
) {
  const cubeRef = useRef<BluetoothCube>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [initialState, setInitialState] = useState<KPattern | null>(null);
  const initialStateInitializedRef = useRef<boolean>(false);

  const handleMove = useEffectEvent((event: MoveEvent) => {
    onMoveEvent?.(event);
  });

  const handleState = useEffectEvent((event: StateEvent) => {
    onStateEvent?.(event);

    if (!initialStateInitializedRef.current) {
      setInitialState(event.kpattern);
      initialStateInitializedRef.current = true;
    }
  });

  useEffect(() => {
    const cube = cubeRef.current;
    if (!cube) return;

    const cleanupMove = cube.onMoveEvent(handleMove);
    const cleanupState = cube.onStateEvent(handleState);

    return () => {
      // Call the cleanup functions returned from onMoveEvent/onStateEvent
      cleanupMove();
      cleanupState();
    };
  }, [connected, onMoveEvent, onStateEvent]);

  // Track orientation with useSyncExternalStore
  const orientation = useSyncExternalStore(
    (callback) => {
      const cube = cubeRef.current;
      if (!cube) return () => {};

      // Throttle with RAF
      let rafId: number | null = null;

      const handleOrientation = () => {
        // Still call user's callback if provided
        // onOrientationEvent?.(event);

        // Throttle React updates
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            callback(); // Tell React to re-read the snapshot
            rafId = null;
          });
        }
      };

      const cleanup = cube.onOrientationEvent(handleOrientation);

      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        cleanup();
      };
    },
    () => cubeRef.current?.orientation ?? DEFAULT_ORIENTATION,
    () => DEFAULT_ORIENTATION
  );

  /**
   * Due to web bluetooth API, this connect() callback will only work when triggered by a user gesture (e.g. button click)
   */
  const connect = useCallback(
    async (onConnect?: () => void) => {
      const cube = await connectCube();
      cubeRef.current = cube;

      //TODO - attach listeners, handle callbacks, etc.

      // cube.onMoveEvent((event: MoveEvent) => {

      //   onMoveEvent?.(event);
      // });

      // cube.onStateEvent((event: StateEvent) => {
      //   // console.log("[UseBluetoothCube] received state event", event);
      //   onStateEvent?.(event);
      // });
      cube.onOrientationEvent((event: OrientationEvent) => {
        // console.log("[UseBluetoothCube] received orientation event", event);
        onOrientationEvent?.(event);
      });

      setConnected(true);
      onConnect?.();
    },
    [onOrientationEvent]
  );

  const disconnect = useCallback(async () => {
    await cubeRef.current?.disconnect();
    setConnected(false);
  }, []);

  // eslint-disable-next-line react-hooks/refs
  return {
    // eslint-disable-next-line react-hooks/refs
    cube: cubeRef.current,
    connected,
    initialState,
    orientation,
    connect,
    disconnect,
  };
}
