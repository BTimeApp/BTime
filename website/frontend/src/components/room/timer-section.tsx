import type { Penalty } from "@btime/types";

import BluetoothCubeTimer from "@/components/room/timers/bluetooth-cube-timer";
import BluetoothTimer from "@/components/room/timers/bluetooth-timer";
import KeyboardTimer from "@/components/room/timers/keyboard-timer";
import TypingTimer from "@/components/room/timers/typing-timer";
import VirtualTimer from "@/components/room/timers/virtual-timer";
import { useRoomStore } from "@/context/room-context";
import { Result } from "@btime/lib";
import { ROOM_EVENTS_INFO, TIMER_TYPES_INFO } from "@btime/types";
import { useCallback } from "react";
import { ErrorBoundary } from "react-error-boundary";

type TimerSectionProps = {
  scramble?: string;
};

/**
 * Displays information related to the timer for the LOCAL USER ONLY.
 * This varies mainly depending on local user's TimerType.
 */
function TimerSection({ scramble }: TimerSectionProps) {
  const localPenalty = useRoomStore((s) => s.localPenalty);
  const timerType = useRoomStore((s) => s.timerType);
  const roomEvent = useRoomStore((s) => s.roomEvent);
  const setLocalPenalty = useRoomStore((s) => s.setLocalPenalty);
  const setLocalResult = useRoomStore((s) => s.setLocalResult);
  const updateLocalSolveStatus = useRoomStore((s) => s.updateLocalSolveStatus);

  const endInspectionCallback = useCallback(
    (penalty: Penalty) => {
      setLocalPenalty(penalty);
      updateLocalSolveStatus();
    },
    [updateLocalSolveStatus, setLocalPenalty]
  );

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
    },
    [updateLocalSolveStatus, setLocalResult, localPenalty]
  );

  if (!TIMER_TYPES_INFO[timerType].allowsEvent(roomEvent)) {
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
      return <TypingTimer onFinishTimer={endStringTimerCallback} />;
    case "KEYBOARD":
      return (
        <KeyboardTimer
          onFinishInspection={endInspectionCallback}
          onFinishTimer={endNumberTimerCallback}
        />
      );
    case "BLUETOOTHTIMER":
      return (
        <BluetoothTimer
          onFinishInspection={endInspectionCallback}
          onFinishTimer={endNumberTimerCallback}
        />
      );
    case "VIRTUAL":
      return (
        <ErrorBoundary FallbackComponent={VirtualTimerErrorFallback}>
          <VirtualTimer
            scramble={scramble}
            event={roomEvent}
            onFinishInspection={endInspectionCallback}
            onFinishTimer={endNumberTimerCallback}
          />
        </ErrorBoundary>
      );
    case "BLUETOOTHCUBE":
      return (
        <BluetoothCubeTimer
          scramble={scramble}
          onFinishInspection={endInspectionCallback}
          onFinishTimer={endNumberTimerCallback}
        />
      );
    default:
      console.warn(`Illegal timer type encountered: ${timerType}`);
      return;
  }
}

function VirtualTimerErrorFallback() {
  return (
    <div className="text-wrap text-onerror">
      You are trying to use VirtualTimer with an incompatible room event. Either
      switch room events or switch to a different timer.
    </div>
  );
}

export default TimerSection;
