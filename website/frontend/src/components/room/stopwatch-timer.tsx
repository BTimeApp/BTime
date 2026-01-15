import type { TimerType } from "@btime/types";

import KeyListener from "@/components/common/key-listener";
import { Result } from "@btime/lib";
import { useCallback, useEffect, useRef, useState } from "react";

type StopwatchTimerProps = {
  startTime?: number;
  onFinishTimer?: (timerValue: number) => void;
  timerType: TimerType;
  className?: string;
};

function StopwatchTimer({
  startTime,
  onFinishTimer,
  timerType,
  className,
}: StopwatchTimerProps) {
  const [elapsed, setElapsed] = useState<number>(0);
  // eslint-disable-next-line react-hooks/purity
  const startRef = useRef<number>(startTime ? startTime : performance.now());
  const animationRef = useRef<number>(0);

  // startTime prop change does not update startRef on its own (we need a ref to use with RAF).
  // need this useEffect to correctly update startRef value
  // TODO figure out a cleaner pattern
  useEffect(() => {
    // for new startTime, we need to effectively reset the timer.
    if (startTime != null) {
      startRef.current = startTime;
      setElapsed(0);
    }
  }, [startTime]);

  useEffect(() => {
    const update = () => {
      const now = performance.now();
      setElapsed(now - startRef.current);
      animationRef.current = requestAnimationFrame(update);
    };

    animationRef.current = requestAnimationFrame(update);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleKeyDown = useCallback(() => {
    onFinishTimer?.(Math.floor(elapsed / 10));
  }, [elapsed, onFinishTimer]);

  return (
    <div className={className}>
      {timerType === "KEYBOARD" && (
        <KeyListener keyName="Space" onKeyDown={handleKeyDown} />
      )}
      <div>{Result.timeToString(Math.floor(elapsed / 10))}</div>
    </div>
  );
}

export default StopwatchTimer;
