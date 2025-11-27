import React, { useCallback, useEffect, useRef, useState } from "react";
import { GanTimerEvent, GanTimerState } from "gan-web-bluetooth";
import { Button } from "@/components/ui/button";
import { Subscription } from "react-hook-form/dist/utils/createSubject";
import { toast } from "sonner";
import { useRoomStore } from "@/context/room-context";
import InspectionCountdown from "@/components/room/inspection-countdown";
import StopwatchTimer from "@/components/room/stopwatch-timer";
import { Penalty } from "@/types/result";
import { cn } from "@/lib/utils";
import { useGanTimerStore } from "@/stores/gan-timer-store";

type GanTimerProps = {
  onFinishInspection?: (penalty: Penalty) => void;
  onFinishTimer: (timerValue: number) => void;
};

export function GanTimer({ onFinishInspection, onFinishTimer }: GanTimerProps) {
  const [
    connection,
    connected,
    timerState,
    previousDisplayTimeMS,
    connect,
    setPreviousDisplayTimeMS,
    setTimerState,
  ] = useGanTimerStore((s) => [
    s.connection,
    s.connected,
    s.timerState,
    s.previousDisplayTimeMS,
    s.connect,
    s.setPreviousDisplayTimeMS,
    s.setTimerState,
  ]);
  const subscription = useRef<Subscription>(null);
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
   * Main callback logic for updating client state when gan timer pushes a new event
   */
  const ganTimerStateUpdateCallback = useCallback(
    async (evt: GanTimerEvent) => {
      console.log(evt.state);
      //evt.state is the new state coming in from the timer
      switch (evt.state) {
        case GanTimerState.HANDS_ON:
          // only emits when gan timer's current result is cleared
          if (localSolveStatus === "IDLE" || localSolveStatus === "INSPECTING")
            setTextStyle("text-timer-notready");
          break;
        case GanTimerState.HANDS_OFF:
          // only emits when gan timer's current result is cleared
          setTextStyle("");
          break;
        case GanTimerState.GET_SET:
          // only emits when gan timer's current result is cleared
          if (localSolveStatus === "IDLE" || localSolveStatus === "INSPECTING")
            setTextStyle("text-timer-ready");
          break;
        case GanTimerState.IDLE:
          //IDLE is triggered by quick pressing the reset button

          switch (localSolveStatus) {
            case "IDLE":
              //we cannot extract the current display time to check whether or not to inspect or not b/c upon receiving this event, the current display time is 0
              if (useInspection && previousDisplayTimeMS === 0)
                updateLocalSolveStatus("");
              break;
            case "INSPECTING":
              //user cancels inspection - go back to idle.
              updateLocalSolveStatus("TIMER_RESET");
              break;
            default:
              break;
          }

          //reset previous display time
          setPreviousDisplayTimeMS(0);
          break;
        case GanTimerState.RUNNING:
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
            console.log("Call updatelocalsolvestatus");
            updateLocalSolveStatus("TIMER_START");
          }
          setTextStyle("");
          break;
        case GanTimerState.STOPPED:
          console.log(
            `gan timer stopped when localSolveStatus was ${localSolveStatus}`
          );
          // only allow advancing state on first cycle of solving -> stop timer.
          const actualTimeMS = evt.recordedTime!.asTimestamp;
          if (localSolveStatus === "SOLVING") {
            //truncate to hundredths + handle updaatelocalsolvestatus to update to SUBMITTING

            onFinishTimer(Math.floor(actualTimeMS / 10));
          }

          //update previous display time regardless of whether or not it matters for client state
          setPreviousDisplayTimeMS(actualTimeMS);
          break;
        case GanTimerState.DISCONNECT:
          toast.info("GAN Timer disconnected.");
          subscription?.current?.unsubscribe();
          subscription.current = null;
          resetLocalSolveStatus();
          setTextStyle("");
          break;
      }

      setTimerState(evt.state);
    },
    [
      localSolveStatus,
      useInspection,
      localInspectionPenalty,
      onFinishInspection,
      onFinishTimer,
      resetLocalSolveStatus,
      updateLocalSolveStatus,
      previousDisplayTimeMS,
      setPreviousDisplayTimeMS,
      setTimerState,
    ]
  );

  /**
   * Callback for attaching subscriber to a connection.
   * This subscriber attaches the listener logic in ganTimerStateUpdateCallback for us.
   * Refreshes per new connection.
   */
  useEffect(() => {
    if (connection) {
      if (subscription.current) {
        subscription.current.unsubscribe();
      }
      subscription.current = connection.events$.subscribe(
        ganTimerStateUpdateCallback
      );
    }
  }, [ganTimerStateUpdateCallback, connection]);

  const onFailToConnect = useCallback((err: Error) => {
    toast.error(`Error when connecting to GAN Timer: ${err.message}`);
  }, []);

  /**
   * Clean up subscription ref on dismount. Don't dc the connection!
   */
  useEffect(() => {
    return () => {
      try {
        subscription.current?.unsubscribe();
        subscription.current = null;
      } catch (err) {
        console.log(err);
      }
    };
  }, []);

  if (!connected || !timerState) {
    return (
      <div className="flex flex-col">
        <p>
          Warning: You need to use a browser that supports bluetooth to use GAN
          Timer.
        </p>
        <Button
          onClick={() => {
            connect(undefined, onFailToConnect);
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
            timerType="GANTIMER"
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
            timerType="GANTIMER"
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
