import type { Penalty } from "@btime/types";
import type { TimerType } from "@btime/types";

import KeyListener from "@/components/common/key-listener";
import { cn } from "@/lib/utils";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useEffectEvent,
} from "react";

type InspectionCountdownProps = {
  onFinishInspection?: (penalty: Penalty) => void;
  timerType: TimerType;
  className?: string;
};

function InspectionCountdown({
  onFinishInspection,
  timerType,
  className,
}: InspectionCountdownProps) {
  const [remainingTime, setRemainingTime] = useState<number>(15); //performance.now() uses milliseconds
  const [penalty, setPenalty] = useState<Penalty>("OK");
  const [spacebarDown, setSpacebarDown] = useState<boolean>(false);
  const penaltyRef = useRef<Penalty>("OK");
  // eslint-disable-next-line react-hooks/purity
  const startRef = useRef<number>(performance.now());
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const update = () => {
      const newTime = Math.ceil(
        (15000 - (performance.now() - startRef.current)) / 1000
      );
      if (newTime != remainingTime) {
        setRemainingTime(newTime);
      }
      animationRef.current = requestAnimationFrame(update);
    };

    animationRef.current = requestAnimationFrame(update);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [remainingTime]);

  useEffect(() => {
    let newPenalty: Penalty = "OK";

    if (remainingTime <= -2) {
      newPenalty = "DNF";
    } else if (remainingTime <= 0) {
      newPenalty = "+2";
    }

    if (penalty !== newPenalty) {
      setPenalty(newPenalty);
      penaltyRef.current = newPenalty;
    }
  }, [remainingTime, penalty]);

  const handleKeyDown = useCallback(() => {
    setSpacebarDown(true);
  }, []);

  const handleKeyUp = useCallback(() => {
    setSpacebarDown(false);
    onFinishInspection?.(penaltyRef.current);
  }, [onFinishInspection]);

  /**
   * While this doesn't super belong here, it's the only pattern that makes inspection penalties with bluetooth timer work right now.
   */
  const finishInspectionEvent = useEffectEvent(() => {
    if (timerType === "BLUETOOTHTIMER" || timerType === "VIRTUAL") {
      onFinishInspection?.(penaltyRef.current);
    }
  });
  useEffect(() => {
    return () => {
      finishInspectionEvent();
    };
  }, [onFinishInspection]);

  return (
    <>
      {timerType === "KEYBOARD" && (
        <KeyListener
          keyName="Space"
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
        />
      )}
      <div
        className={cn(
          remainingTime <= 8 && "text-timer-warning",
          remainingTime <= 3 && "text-timer-notready",
          spacebarDown && "text-timer-ready",
          className
        )}
      >
        {penalty === "DNF"
          ? "DNF"
          : penalty === "+2"
          ? "+2"
          : remainingTime.toString()}
      </div>
    </>
  );
}

export default InspectionCountdown;
