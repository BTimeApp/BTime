import type {
  BluetoothCube,
  CubeMoveEventListener,
  CubeOrientationEventListener,
  CubeStateEventListener,
  MoveEvent,
  OrientationEvent,
  StateEvent,
} from "@btime/bluetooth-cubing";

import { connectCube } from "@btime/bluetooth-cubing";
import { useCallback, useRef, useState } from "react";

export function useBluetoothCube(
  onMoveEvent?: CubeMoveEventListener,
  onStateEvent?: CubeStateEventListener,
  onOrientationEvent?: CubeOrientationEventListener
) {
  const timerRef = useRef<BluetoothCube>(null);
  const [connected, setConnected] = useState<boolean>(false);

  /**
   * Due to web bluetooth API, this connect() callback will only work when triggered by a user gesture (e.g. button click)
   */
  const connect = useCallback(
    async (onConnect?: () => void) => {
      const timer = await connectCube();
      timerRef.current = timer;

      //TODO - attach listeners, handle callbacks, etc.

      timer.onMoveEvent((event: MoveEvent) => {
        console.log("[UseBluetoothCube] received move event", event);
        onMoveEvent?.(event);
      });

      timer.onStateEvent((event: StateEvent) => {
        console.log("[UseBluetoothCube] received state event", event);
        onStateEvent?.(event);
      });
      timer.onOrientationEvent((event: OrientationEvent) => {
        console.log("[UseBluetoothCube] received orientation event", event);
        onOrientationEvent?.(event);
      });

      setConnected(true);
      onConnect?.();
    },
    [onMoveEvent, onStateEvent, onOrientationEvent]
  );

  const disconnect = useCallback(async () => {
    await timerRef.current?.disconnect();
    setConnected(false);
  }, []);

  // eslint-disable-next-line react-hooks/refs
  return {
    // eslint-disable-next-line react-hooks/refs
    timer: timerRef.current,
    connected,
    connect,
    disconnect,
  };
}
