import type { Penalty } from "@btime/types";

import { useTimer } from "@/hooks/use-timer";
import { useCallback, useMemo } from "react";

export function useInspectionCountdown(
  onStartInspection?: () => void,
  onFinishInspection?: (penalty: Penalty) => void
) {
  // we only want an inspection countdown to trigger new logic every second.
  const { time, startTimer, stopTimer, isRunning } = useTimer(100);

  const inspectionTimeRemaining = useMemo(() => {
    return Math.ceil((1500 - time) / 100);
  }, [time]);

  const currentPenalty = useMemo(() => {
    if (inspectionTimeRemaining <= -2) {
      return "DNF";
    } else if (inspectionTimeRemaining <= 0) {
      return "+2";
    } else {
      return "OK";
    }
  }, [inspectionTimeRemaining]);

  const startInspection = useCallback(() => {
    startTimer();
    onStartInspection?.();
  }, [onStartInspection, startTimer]);

  const finishInspection = useCallback(() => {
    stopTimer();
    onFinishInspection?.(currentPenalty);
  }, [onFinishInspection, currentPenalty, stopTimer]);

  return {
    time: inspectionTimeRemaining,
    inspectionPenalty: currentPenalty,
    startInspection,
    finishInspection, //note: calling stopTimer() by itself acts as a reset
    isRunning,
  };
}
