import React, { useEffect, useRef, useState, useCallback } from "react";
import { Penalty } from "@/types/result";
import KeyListener from "@/components/common/key-listener";
import { cn } from "@/lib/utils";
import { TimerType } from "@/types/timer-type";

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

  useEffect(() => {
    return () => {
      if (timerType === "GANTIMER") {
        onFinishInspection?.(penaltyRef.current);
      }
    };
  }, [onFinishInspection, timerType]);

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
          className,
          remainingTime <= 8 && "text-timer-warning",
          remainingTime <= 3 && "text-timer-notready",
          spacebarDown && "text-timer-ready",
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
