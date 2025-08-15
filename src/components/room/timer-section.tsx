import { useCallback, useState } from "react";
import KeyListener from "@/components/common/key-listener";
import StopwatchTimer from "@/components/room/stopwatch-timer";
import { Penalty, Result } from "@/types/result";
import { CallbackInput } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import InspectionCountdown from "./inspection-countdown";
import { useRoomStore } from "@/context/room-context";


function TimerSection() {
  const [spacebarDown, setSpacebarDown] = useState<boolean>(false);
  const [
    localPenalty,
    localResult,
    timerType,
    localSolveStatus,
    useInspection,
    liveTimerStartTime,
    setLocalPenalty,
    setLocalResult,
    updateLocalSolveStatus,
  ] = useRoomStore((s) => [
    s.localPenalty,
    s.localResult,
    s.timerType,
    s.localSolveStatus,
    s.useInspection,
    s.liveTimerStartTime,
    s.setLocalPenalty,
    s.setLocalResult,
    s.updateLocalSolveStatus,
  ]);

  const endStringTimerCallback = useCallback(
    (value: string) => {
      try {
        setLocalResult(new Result(value, localPenalty));
        updateLocalSolveStatus();
      } catch {
        //do not handle error - is likely an invalid time string
      }
    },
    [updateLocalSolveStatus, setLocalResult, localPenalty]
  );

  const endNumberTimerCallback = useCallback(
    (timerValue: number) => {
      setLocalResult(new Result(timerValue, localPenalty));
      updateLocalSolveStatus();
    },
    [updateLocalSolveStatus, setLocalResult, localPenalty]
  );

  const endInspectionCallback = useCallback((penalty: Penalty) => {
    setLocalPenalty(penalty);
    updateLocalSolveStatus();
  }, [updateLocalSolveStatus, setLocalPenalty]);

  switch (timerType) {
    case "TYPING":
      switch (localSolveStatus) {
        case "IDLE":
          return null;
        case "SOLVING":
          return (
            <>
              <div>Press Enter to submit time</div>
              <CallbackInput
                type="text"
                className="text-center"
                onEnter={endStringTimerCallback}
              />
            </>
          );
        case "SUBMITTING":
          return <div className="text-2xl">{localResult.toString()}</div>;
        case "FINISHED":
        default:
          return (
            <>
              <div>Waiting for others to finish</div>
            </>
          );
      }
      break;
    case "KEYBOARD":
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
                  updateLocalSolveStatus(); //updateLocalSolveStatus
                  setSpacebarDown(false);
                }}
                onKeyDown={() => {
                  setSpacebarDown(true);
                }}
              >
                <div
                  className={cn(
                    `text-4xl ${spacebarDown ? "text-green-500" : ""}`
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
                }}
                onKeyDown={() => {
                  setSpacebarDown(true);
                }}
              >
                <InspectionCountdown
                  className="text-4xl"
                  onFinishInspection={endInspectionCallback}
                />
              </KeyListener>
            </>
          );
        case "SOLVING":
          return (
            <>
              <div>Press Space to Stop</div>
              {/* TODO - make this hold the amount of time left in inspection */}
              <StopwatchTimer
                startTime={liveTimerStartTime}
                onFinishTimer={endNumberTimerCallback}
                className="text-4xl"
              />
            </>
          );
        case "SUBMITTING":
          return <div className="text-4xl">{localResult.toString()}</div>;
        case "FINISHED":
          return (
            <>
              <div>Waiting for others to finish</div>
            </>
          );
        default:
          return <></>;
      }
      break;
    default:
      return;
  }
}

export default TimerSection;
