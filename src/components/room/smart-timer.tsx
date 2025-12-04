import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRoomStore } from "@/context/room-context";
import InspectionCountdown from "@/components/room/inspection-countdown";
import StopwatchTimer from "@/components/room/stopwatch-timer";
import { Penalty } from "@/types/result";
import { cn } from "@/lib/utils";
import { useSmartTimerStore } from "@/stores/smart-timer-store";
import { TimerEvent, TimerState } from "@btime/bluetooth-cubing";

type SmartTimerProps = {
  onFinishInspection?: (penalty: Penalty) => void;
  onFinishTimer: (timerValue: number) => void;
};

export function SmartTimer({
  onFinishInspection,
  onFinishTimer,
}: SmartTimerProps) {
  const [
    connected,
    timer,
    currentDisplayTimeMS,
    eventCallbackRef,
    connect,
  ] = useSmartTimerStore((s) => [
    s.connected,
    s.timer,
    s.currentDisplayTimeMS,
    s.eventCallbackRef,
    s.connect,
  ]);
  const [textStyle, setTextStyle] = useState<string>("");

  const [localInspectionPenalty, setLocalInspectionPenalty] =
    useState<Penalty>("OK");

  const [
    localSolveStatus,
    liveTimerStartTime,
    localResult,
    useInspection,
    updateLocalSolveStatus,
    resetLocalSolveStatus,
  ] = useRoomStore((s) => [
    s.localSolveStatus,
    s.liveTimerStartTime,
    s.localResult,
    s.useInspection,
    s.updateLocalSolveStatus,
    s.resetLocalSolveStatus,
  ]);

  /**
   * Main callback logic for updating client state when timer pushes a new event
   * Set it up this way to avoid stale closure, maybe there's a better way out there
   */
  eventCallbackRef.current = useCallback(
    (evt: TimerEvent) => {
      //evt.state is the new state coming in from the timer
      switch (evt.state) {
        case TimerState.HANDS_ON:
          // only emits when gan timer's current result is cleared
          if (localSolveStatus === "IDLE" || localSolveStatus === "INSPECTING")
            setTextStyle("text-timer-notready");
          break;
        case TimerState.HANDS_OFF:
          // only emits when gan timer's current result is cleared
          setTextStyle("");
          break;
        case TimerState.GET_SET:
          // only emits when gan timer's current result is cleared
          if (localSolveStatus === "IDLE" || localSolveStatus === "INSPECTING")
            setTextStyle("text-timer-ready");
          break;
        case TimerState.IDLE:
          //IDLE is triggered by quick pressing the reset button

          switch (localSolveStatus) {
            case "IDLE":
              //we cannot extract the current display time to check whether or not to inspect or not b/c upon receiving this event, the current display time is 0
              if (useInspection && currentDisplayTimeMS === 0)
                updateLocalSolveStatus("");
              break;
            case "INSPECTING":
              //user cancels inspection - go back to idle.
              updateLocalSolveStatus("TIMER_RESET");
              break;
            default:
              break;
          }

          break;
        case TimerState.INSPECTION:
          //we should only enable inspection when the user has inspection on
          if (localSolveStatus === "IDLE" && useInspection && currentDisplayTimeMS === 0) {
            updateLocalSolveStatus();
          }
          break;
        case TimerState.RUNNING:
          // prevent status updates when wrong localSolveStatus
          if (
            localSolveStatus !== "IDLE" &&
            localSolveStatus !== "INSPECTING"
          ) {
            break;
          }

          //updatelocalsolvestatus should kick off the useStartTimeOnTransition hook in room-event-handler and update liveTimerStartTime
          if (useInspection && localSolveStatus === "INSPECTING") {
            //this will already include updateLocalSolveStatus
            onFinishInspection?.(localInspectionPenalty);
          } else {
            updateLocalSolveStatus("TIMER_START");
          }
          setTextStyle("");
          break;
        case TimerState.STOPPED:
          // only allow advancing state on first cycle of solving -> stop timer.
          const actualTimeMS = evt.recordedTime!;
          if (localSolveStatus === "SOLVING") {
            //truncate to hundredths + handle updaatelocalsolvestatus to update to SUBMITTING

            onFinishTimer(Math.floor(actualTimeMS / 10));
          }
          break;
        case TimerState.DISCONNECT:
          toast.info("GAN Timer disconnected.");
          resetLocalSolveStatus();
          setTextStyle("");
          break;
      }
    },
    [
      currentDisplayTimeMS,
      localSolveStatus,
      useInspection,
      localInspectionPenalty,
      onFinishInspection,
      onFinishTimer,
      resetLocalSolveStatus,
      updateLocalSolveStatus,
    ]
  );

  const onConnect = useCallback(() => {
    toast.success("Successfully connected to bluetooth timer");
  }, []);

  const onFailToConnect = useCallback((err: Error) => {
    toast.error(`Error when connecting to bluetooth timer: ${err.message}`);
  }, []);

  if (!connected || !timer) {
    return (
      <div className="flex flex-col">
        {/* TODO: change this to general bluetooth timer when we support more than GAN timer */}
        <p>
          Warning: You need to use a browser that supports bluetooth to use GAN
          Timer.
        </p>
        <Button
          onClick={() => {
            connect(onConnect, onFailToConnect);
          }}
          size="sm"
          variant="primary"
          className="mx-auto"
        >
          Connect Timer
        </Button>
      </div>
    );
  } else {
    switch (localSolveStatus) {
      case "IDLE":
        return <div className={cn("text-4xl", textStyle)}>-.--</div>;
      case "INSPECTING":
        return (
          <InspectionCountdown
            timerType="BLUETOOTH"
            onFinishInspection={(penalty: Penalty) => {
              setLocalInspectionPenalty(penalty);
            }}
            className={cn("text-4xl", textStyle)}
          />
        );
      case "SOLVING":
        return (
          <StopwatchTimer
            startTime={liveTimerStartTime}
            className="text-4xl"
            timerType="BLUETOOTH"
          />
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
        break;
    }
  }
}
