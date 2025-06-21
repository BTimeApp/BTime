import { useState } from "react";
import KeyListener from "@/components/common/key-listener";
import StopwatchTimer from "@/components/room/stopwatch-timer";
import { Penalty, Result } from "@/types/result";
import { SolveStatus } from "@/types/status";
import { TimerType } from "@/types/timerType";
import { CallbackInput } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import InspectionCountdown from "./inspection-countdown";

type TimerSectionProps = {
  timerType: TimerType;
  userStatus: SolveStatus;
  useInspection?: boolean;
  localResult: Result;
  manualInputCallback?: (value: string) => void;
  startInspectionCallback?: () => void;
  endInspectionCallback?: (penalty: Penalty) => void;
  endTimerCallback?: (value: number) => void;
};

function TimerSection({
  timerType,
  userStatus,
  useInspection = true,
  localResult,
  manualInputCallback,
  startInspectionCallback,
  endInspectionCallback,
  endTimerCallback,
}: TimerSectionProps) {
  const [spacebarDown, setSpacebarDown] = useState<boolean>(false);

  switch (timerType) {
    case "TYPING":
      switch (userStatus) {
        case "SOLVING":
          return (
            <>
              <div>Press Enter to submit time</div>
              <CallbackInput
                type="text"
                className="text-center"
                onEnter={manualInputCallback}
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
      switch (userStatus) {
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
                  startInspectionCallback?.();
                  setSpacebarDown(false);
                }}
                onKeyDown={() => {
                  setSpacebarDown(true);
                }}
              >
                <div
                  className={cn(
                    `text-2xl ${spacebarDown ? "text-green-500" : ""}`
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
                <InspectionCountdown className="text-2xl"
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
                startTime={performance.now()}
                onFinishTimer={endTimerCallback}
                className="text-2xl"
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
    default:
      return;
  }
}

export default TimerSection;
