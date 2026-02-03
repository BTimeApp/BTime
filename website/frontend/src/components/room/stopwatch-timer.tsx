import type { TimerType } from "@btime/types";

import KeyListener from "@/components/common/key-listener";
import { useTimer } from "@/hooks/use-timer"; // Import the hook
import { Result } from "@btime/lib";
import { useCallback, useEffect } from "react";

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
  const { time, startTimer, stopTimer } = useTimer();

  // Start timer on mount or when startTime changes
  useEffect(() => {
    startTimer(startTime);
  }, [startTime, startTimer]);

  const handleKeyDown = useCallback(() => {
    const finalTime = stopTimer();
    onFinishTimer?.(finalTime);
  }, [stopTimer, onFinishTimer]);

  return (
    <div className={className}>
      {timerType === "KEYBOARD" && (
        <KeyListener keyName="Space" onKeyDown={handleKeyDown} />
      )}
      <div>{Result.timeToString(time)}</div>
    </div>
  );
}

export default StopwatchTimer;
