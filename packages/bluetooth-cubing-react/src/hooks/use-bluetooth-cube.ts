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
  const [initialState, setInitialState] = useState<KPattern | undefined>(
    undefined
  );
  const initialStateInitializedRef = useRef<boolean>(false);

  const handleMove = useEffectEvent((event: MoveEvent) => {
    if (initialStateInitializedRef.current) {
      onMoveEvent?.(event);
    }
  });

  useEffect(() => {
    const cube = cubeRef.current;
    if (!cube) return;

    const cleanupMove = cube.onMoveEvent(handleMove);

    return () => {
      cleanupMove();
    };
  }, [connected, onMoveEvent]);

  // Track orientation with useSyncExternalStore
  const orientation = useSyncExternalStore(
    (callback) => {
      const cube = cubeRef.current;
      if (!cube) return () => {};

      // Throttle with RAF
      let rafId: number | null = null;

      const handleOrientation = () => {
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

      const handleStateEvent = (event: StateEvent) => {
        // console.log("[handleStateEvent] state", event.kpattern.patternData);
        onStateEvent?.(event);

        if (!initialStateInitializedRef.current) {
          // always prefer using the cube's tracked initial state if possible
          setInitialState(event.kpattern);

          initialStateInitializedRef.current = true;
        }
      };

      const handleDisconnectEvent = () => {
        initialStateInitializedRef.current = false;
        setInitialState(undefined);
        setConnected(false);
      };

      cube.onStateEvent(handleStateEvent);
      cube.onDisconnectEvent(handleDisconnectEvent);

      cube.onOrientationEvent((event: OrientationEvent) => {
        onOrientationEvent?.(event);
      });

      await cube.sync();

      setConnected(true);
      onConnect?.();
    },
    [onOrientationEvent, onStateEvent]
  );

  const sync = useCallback(async () => {
    setInitialState(undefined);
    initialStateInitializedRef.current = false;

    await cubeRef.current?.sync();
  }, []);

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
    sync,
    disconnect,
  };
}
