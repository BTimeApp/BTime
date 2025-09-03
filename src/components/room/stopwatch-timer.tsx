import React, { useCallback, useEffect, useRef, useState } from "react";
import { Result } from "@/types/result";
import KeyListener from "@/components/common/key-listener";
import { TimerType } from "@/types/timer-type";

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
  const startRef = useRef<number>(startTime ? startTime : performance.now());
  const animationRef = useRef<number>(0);

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
