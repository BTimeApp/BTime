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

import { connectCube, IDENTITY_QUATERNION } from "@btime/bluetooth-cubing";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

export function useBluetoothCube(
  onMoveEvent?: CubeMoveEventListener,
  onStateEvent?: CubeStateEventListener,
  onOrientationEvent?: CubeOrientationEventListener,
  onSolved?: () => void
) {
  const cubeRef = useRef<BluetoothCube>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [solved, setSolved] = useState<boolean>(false);
  const [initialState, setInitialState] = useState<KPattern | undefined>(
    undefined
  );
  const initialStateInitializedRef = useRef<boolean>(false);

  const onStateEventRef = useRef(onStateEvent);
  const onOrientationEventRef = useRef(onOrientationEvent);
  const onSolvedRef = useRef(onSolved);

  useEffect(() => {
    onSolvedRef.current = onSolved;
  }, [onSolved]);

  useEffect(() => {
    onStateEventRef.current = onStateEvent;
  }, [onStateEvent]);

  useEffect(() => {
    onOrientationEventRef.current = onOrientationEvent;
  }, [onOrientationEvent]);

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
  }, [connected]);

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
            callback();
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
    () => cubeRef.current?.orientation ?? IDENTITY_QUATERNION,
    () => IDENTITY_QUATERNION
  );

  /**
   * Due to web bluetooth API, this connect() callback will only work when triggered by a user gesture (e.g. button click)
   */
  const connect = useCallback(async (onConnect?: () => void) => {
    const cube = await connectCube();
    cubeRef.current = cube;

    const handleStateEvent = (event: StateEvent) => {
      onStateEventRef.current?.(event);

      if (!initialStateInitializedRef.current) {
        // always prefer using the cube's tracked initial state if possible
        setInitialState(event.kpattern);

        initialStateInitializedRef.current = true;
      }

      if (
        event.kpattern.experimentalIsSolved({
          ignoreCenterOrientation: true,
          ignorePuzzleOrientation: true,
        })
      ) {
        setSolved(true);
        onSolvedRef.current?.();
      } else {
        setSolved(false);
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
      onOrientationEventRef.current?.(event);
    });

    await cube.sync();

    setConnected(true);
    onConnect?.();
  }, []);

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
    solved,
    connected,
    initialState,
    orientation,
    connect,
    sync,
    disconnect,
  };
}
