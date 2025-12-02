import { useCallback, useRef, useState } from "react";
import {
  SmartTimer,
  TimerEvent,
  TimerState,
  connectTimer,
} from "../types/timers";

export function useSmartTimer(onTimerEvent?: (event: TimerEvent) => void) {
  const timerRef = useRef<SmartTimer>(null);
  const [timerState, setTimerState] = useState<TimerState>(
    TimerState.IDLE
  );
  const [recordedTime, setRecordedTime] = useState<number>(0);
  const [connected, setConnected] = useState<boolean>(false);

  /**
   * Due to web bluetooth API, this connect() callback will only work when triggered by a user gesture (e.g. button click)
   */
  const connect = useCallback(
    async (onConnect?: () => void) => {
      const timer = await connectTimer();
      timerRef.current = timer;

      timer.onTimerEvent((event: TimerEvent) => {
        setTimerState(event.state);

        if (event.recordedTime) {
          setRecordedTime(event.recordedTime);
        }

        if (event.state === TimerState.IDLE) {
          setRecordedTime(0);
        }

        if (event.state === TimerState.DISCONNECT) {
          timerRef.current = null;
          setRecordedTime(0);
          setConnected(false);
        }

        onTimerEvent?.(event);
      });
      setConnected(true);
      onConnect?.();
    },
    [onTimerEvent]
  );

  const disconnect = useCallback(async () => {
    await timerRef.current?.disconnect();
    setTimerState(TimerState.DISCONNECT);
    setRecordedTime(0);
    setConnected(false);
  }, []);

  return {
    timer: timerRef.current,
    timerState,
    recordedTime,
    connected,
    connect,
    disconnect,
  };
}
