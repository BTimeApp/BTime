import type { Penalty } from "@btime/types";

import KeyListener from "@/components/common/key-listener";
import InspectionCountdown from "@/components/room/inspection-countdown";
import StopwatchTimer from "@/components/room/stopwatch-timer";
import { useRoomStore } from "@/context/room-context";
import { useInspectionCountdown } from "@/hooks/use-inspection-countdown";
import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";

type KeyboardTimerProps = {
  onFinishInspection?: (penalty: Penalty) => void;
  onFinishTimer: (timerValue: number) => void;
};

export default function KeyboardTimer({
  onFinishInspection,
  onFinishTimer,
}: KeyboardTimerProps) {
  const [spacebarDown, setSpacebarDown] = useState<boolean>(false);
  const localResult = useRoomStore((s) => s.localResult);
  const timerType = useRoomStore((s) => s.timerType);
  const localSolveStatus = useRoomStore((s) => s.localSolveStatus);
  const useInspection = useRoomStore((s) => s.useInspection);
  const liveTimerStartTime = useRoomStore((s) => s.liveTimerStartTime);
  const updateLocalSolveStatus = useRoomStore((s) => s.updateLocalSolveStatus);

  const startInspectionCallback = useCallback(() => {
    setSpacebarDown(false);
    updateLocalSolveStatus();
  }, [updateLocalSolveStatus]);

  const {
    time: inspectionTime,
    startInspection,
    finishInspection,
    inspectionPenalty,
  } = useInspectionCountdown(startInspectionCallback, onFinishInspection);

  switch (localSolveStatus) {
    case "IDLE":
      return (
        <>
          {useInspection ? (
            <div>Press Space to Inspect</div>
          ) : (
            <div>Press Space to Start</div>
          )}
          <KeyListener
            keyName="Space"
            onKeyUp={() => {
              startInspection();
            }}
            onKeyDown={() => {
              setSpacebarDown(true);
            }}
          >
            <div
              className={cn(
                `text-4xl ${spacebarDown ? "text-timer-ready" : ""}`
              )}
            >
              -.--
            </div>
          </KeyListener>
        </>
      );
    case "INSPECTING":
      return (
        <>
          <div>Press Space to Start</div>
          <KeyListener
            keyName="Space"
            onKeyUp={() => {
              setSpacebarDown(false);
              // updateLocalSolveStatus();
              finishInspection();
            }}
            onKeyDown={() => {
              setSpacebarDown(true);
            }}
          >
            <InspectionCountdown
              remainingTime={inspectionTime}
              penalty={inspectionPenalty}
              className="text-4xl"
            />
          </KeyListener>
        </>
      );
    case "SOLVING":
      return (
        <>
          <div>Press Space to Stop</div>
          <StopwatchTimer
            startTime={liveTimerStartTime}
            onFinishTimer={onFinishTimer}
            className="text-4xl"
            timerType={timerType}
          />
        </>
      );
    case "SUBMITTING":
      return <div className="text-4xl">{localResult.toString()}</div>;
    case "FINISHED":
      return (
        <>
          <div>Waiting for others to finish</div>
          <div className="text-4xl">{localResult.toString()}</div>
        </>
      );
    default:
      return <></>;
  }
}
