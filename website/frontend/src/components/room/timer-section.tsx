import type { Penalty } from "@btime/types";

import KeyListener from "@/components/common/key-listener";
import BluetoothTimer from "@/components/room/bluetooth-timer";
import InspectionCountdown from "@/components/room/inspection-countdown";
import StopwatchTimer from "@/components/room/stopwatch-timer";
import VirtualTimer from "@/components/room/virtual-timer";
import { CallbackInput } from "@/components/ui/callback-input";
import { useRoomStore } from "@/context/room-context";
import { cn } from "@/lib/utils";
import { Result, timerAllowsEvent } from "@btime/lib";
import { ROOM_EVENTS_INFO } from "@btime/types";
import { useCallback, useState } from "react";

type TimerSectionProps = {
  scramble?: string;
};

/**
 * Displays information related to the timer for the LOCAL USER ONLY.
 * This varies mainly depending on local user's TimerType.
 */
function TimerSection({ scramble }: TimerSectionProps) {
  const [spacebarDown, setSpacebarDown] = useState<boolean>(false);
  const localPenalty = useRoomStore((s) => s.localPenalty);
  const localResult = useRoomStore((s) => s.localResult);
  const timerType = useRoomStore((s) => s.timerType);
  const localSolveStatus = useRoomStore((s) => s.localSolveStatus);
  const useInspection = useRoomStore((s) => s.useInspection);
  const liveTimerStartTime = useRoomStore((s) => s.liveTimerStartTime);
  const roomEvent = useRoomStore((s) => s.roomEvent);
  const setLocalPenalty = useRoomStore((s) => s.setLocalPenalty);
  const setLocalResult = useRoomStore((s) => s.setLocalResult);
  const updateLocalSolveStatus = useRoomStore((s) => s.updateLocalSolveStatus);

  const endStringTimerCallback = useCallback(
    (value: string) => {
      try {
        if (value === "") {
          return;
        }
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
      setSpacebarDown(false);
    },
    [updateLocalSolveStatus, setLocalResult, setSpacebarDown, localPenalty]
  );

  const endInspectionCallback = useCallback(
    (penalty: Penalty) => {
      setLocalPenalty(penalty);
      updateLocalSolveStatus();
      setSpacebarDown(false);
    },
    [updateLocalSolveStatus, setLocalPenalty, setSpacebarDown]
  );

  if (!timerAllowsEvent(timerType, roomEvent)) {
    return (
      <div className="text-center text-lg text-error font-bold text-wrap">
        You cannot use the {timerType} timer for event{" "}
        {ROOM_EVENTS_INFO[roomEvent]!.displayName}. Switch to a legal timer
        type.
      </div>
    );
  }

  switch (timerType) {
    case "TYPING":
      switch (localSolveStatus) {
        case "IDLE":
        // Make idle (should be illegal) fall back to the solving state.
        // Currently possible to be in IDLE state if joining an already-started room with timertype TYPING in dev mode b/c of react's strict mode (the second render causes the default localSolveStatus to be IDLE)
        // eslint-disable-next-line no-fallthrough
        case "SOLVING":
          return (
            <>
              <div>Press Enter to submit time</div>
              <CallbackInput
                type="text"
                className="text-center text-4xl mx-auto bg-container-1/70 border-none"
                onEnter={endStringTimerCallback}
              />
            </>
          );
        case "SUBMITTING":
          return <div className="text-4xl">{localResult.toString()}</div>;
        case "FINISHED":
        default:
          return (
            <>
              <div>Waiting for others to finish</div>
              <div className="text-4xl">{localResult.toString()}</div>
            </>
          );
      }
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
                  setSpacebarDown(false);
                  updateLocalSolveStatus();
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
              <InspectionCountdown
                className="text-4xl"
                timerType={timerType}
                onFinishInspection={endInspectionCallback}
              />
            </>
          );
        case "SOLVING":
          return (
            <>
              <div>Press Space to Stop</div>
              <StopwatchTimer
                startTime={liveTimerStartTime}
                onFinishTimer={endNumberTimerCallback}
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
    case "BLUETOOTHTIMER":
      return (
        <BluetoothTimer
          onFinishInspection={endInspectionCallback}
          onFinishTimer={endNumberTimerCallback}
        />
      );
    case "VIRTUAL":
      return (
        <VirtualTimer
          scramble={scramble}
          onFinishInspection={endInspectionCallback}
          onFinishTimer={endNumberTimerCallback}
        />
      );
    // case "BLUETOOTHCUBE":
    //   return null;
    default:
      console.warn(`Illegal timer type encountered: ${timerType}`);
      return;
  }
}

export default TimerSection;
