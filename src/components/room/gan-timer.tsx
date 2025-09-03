import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  connectGanTimer,
  GanTimerConnection,
  GanTimerEvent,
  GanTimerState,
} from "gan-web-bluetooth";
import { Button } from "@/components/ui/button";
import { Subscription } from "react-hook-form/dist/utils/createSubject";
import { toast } from "sonner";
import { useRoomStore } from "@/context/room-context";
import { useSocket } from "@/context/socket-context";
import { SOCKET_CLIENT } from "@/types/socket_protocol";
import InspectionCountdown from "@/components/room/inspection-countdown";
import StopwatchTimer from "@/components/room/stopwatch-timer";
import { Penalty } from "@/types/result";
import { cn } from "@/lib/utils";

type GanTimerProps = {
  onFinishInspection?: (penalty: Penalty) => void;
  onFinishTimer: (timerValue: number) => void;
};

export function GanTimer({ onFinishInspection, onFinishTimer }: GanTimerProps) {
  const [timerState, setTimerState] = useState<GanTimerState | null>(null);
  const connection = useRef<GanTimerConnection>(null);
  const [connected, setConnected] = useState<boolean>(false);
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
  const { socket } = useSocket();

  /**
   * Main callback logic for updating client state when gan timer pushes a new event
   */
  const ganTimerStateUpdateCallback = useCallback(
    (evt: GanTimerEvent) => {
      console.log(evt, localSolveStatus);
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
              //proceed to inspection
              if (useInspection) updateLocalSolveStatus("");
              break;
            case "INSPECTING":
              //user cancels inspection - go back to idle.
              updateLocalSolveStatus("TIMER_RESET");
              break;
            default:
              break;
          }
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
            updateLocalSolveStatus("TIMER_START");
          }
          if (socket && socket.connected)
            socket.emit(SOCKET_CLIENT.START_LIVE_TIMER);
          setTextStyle("");
          break;
        case GanTimerState.STOPPED:
          // only allow advancing state on first cycle of solving -> stop timer.
          if (localSolveStatus === "SOLVING") {
            const actualTimeMS = evt.recordedTime!.asTimestamp;
            //truncate to hundredths + handle updaatelocalsolvestatus to update to SUBMITTING
            onFinishTimer(Math.floor(actualTimeMS / 10));

            if (socket && socket.connected)
              socket.emit(SOCKET_CLIENT.STOP_LIVE_TIMER);
          }
          break;
        case GanTimerState.DISCONNECT:
          toast.info("GAN Timer disconnected.");
          connection?.current?.disconnect();
          subscription?.current?.unsubscribe();
          connection.current = null;
          subscription.current = null;
          setConnected(false);
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
      socket,
      onFinishInspection,
      onFinishTimer,
      resetLocalSolveStatus,
      updateLocalSolveStatus,
    ]
  );

  /**
   * Keep subscriber ref updated when callback definition changes. This avoids stale closure
   */
  useEffect(() => {
    if (connection.current) {
      if (subscription.current) {
        subscription.current.unsubscribe();
      }
      subscription.current = connection.current.events$.subscribe(
        ganTimerStateUpdateCallback
      );
    }
  }, [ganTimerStateUpdateCallback, connected]);

  /**
   * Handles connection to the gan timer when connect button is pressed. Resets timer state
   */
  const handleConnect = useCallback(async () => {
    try {
      connection.current = await connectGanTimer();
      setTimerState(GanTimerState.IDLE);
      setConnected(true);
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err.message);
    }
  }, []);

  /**
   * dismount hook - clean up refs, reset connected state
   */
  useEffect(() => {
    return () => {
      try {
        connection.current?.disconnect();
        subscription.current?.unsubscribe();
        connection.current = null;
        subscription.current = null;
        setConnected(false);
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
          onClick={handleConnect}
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
        return <div className="text-4xl">-.--</div>;
      default:
        break;
    }
  }
}
