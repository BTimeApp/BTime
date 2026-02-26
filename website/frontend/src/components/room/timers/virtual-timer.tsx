import type { KeybindMap } from "@/types/keybind";
import type { MoveEvent } from "@btime/bluetooth-cubing";
import type { Penalty, RoomEvent } from "@btime/types";

import InspectionCountdown from "@/components/room/inspection-countdown";
import { Button } from "@/components/ui/button";
import { KeyboardListenerKey } from "@/components/virtual/keyboard-key";
import { useRoomStore } from "@/context/room-context";
import {
  checkSolved,
  useCubeStateManager,
} from "@/hooks/use-cube-state-manager";
import { useInspectionCountdown } from "@/hooks/use-inspection-countdown";
import { useTimer } from "@/hooks/use-timer";
import { EVENT_KPUZZLE_GETTERS } from "@/lib/get-kpuzzle";
import { cn } from "@/lib/utils";
import { useKeybindStore } from "@/stores/keybind-store";
import {
  DEFAULT_MOVE_EVENT_DURATION,
  SLOWEST_MOVE_EVENT_DURATION,
} from "@/types/animation-constants";
import { Result } from "@btime/lib";
import { ROOM_EVENTS_INFO } from "@btime/types";
import { useAnimationQueue, VirtualCube } from "@btime/virtual-cubing-react";
import { Alg, Move } from "cubing/alg";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";

const customAddToQueue = (
  queue: MoveEvent[],
  newElem: MoveEvent
): MoveEvent[] => {
  if (queue.length == 0) {
    return [newElem];
  }

  // update duration for last event if applicable
  const lastEvent = queue.at(-1)!;
  if (lastEvent.duration == null) {
    const elapsedTime = newElem.timestamp - lastEvent.timestamp;
    lastEvent.duration =
      elapsedTime < SLOWEST_MOVE_EVENT_DURATION
        ? elapsedTime
        : DEFAULT_MOVE_EVENT_DURATION;
  }
  queue.push(newElem);

  return queue;
};

const ROTATIONS = new Set<string>(["x", "y", "z"]);

type VirtualTimerProps = {
  scramble?: string;
  event: RoomEvent;
  onFinishInspection?: (penalty: Penalty) => void;
  onFinishTimer: (timerValue: number) => void;
};

export default function VirtualTimer({
  scramble = "",
  event,
  onFinishInspection,
  onFinishTimer,
}: VirtualTimerProps) {
  const getKPuzzle = EVENT_KPUZZLE_GETTERS[event];
  if (!getKPuzzle) {
    throw new Error(
      `VirtualTimer rendered with unsupported event "${event}". ` +
        `This is a bug — check that allowsEvent() guards are in place upstream.`
    );
  }
  const defaultPattern = use(getKPuzzle()).defaultPattern();

  /** State */
  const localSolveStatus = useRoomStore((s) => s.localSolveStatus);
  const localResult = useRoomStore((s) => s.localResult);
  const useInspection = useRoomStore((s) => s.useInspection);
  const updateLocalSolveStatus = useRoomStore((s) => s.updateLocalSolveStatus);

  const [timerTextClassName, setTimerTextClassName] = useState<string>("");
  const [inErrorState, setInErrorState] = useState<boolean>(false);

  const {
    time: inspectionTime,
    startInspection,
    finishInspection,
    inspectionPenalty,
  } = useInspectionCountdown(updateLocalSolveStatus, onFinishInspection);

  /** Keybind map */
  const keybindMap = useKeybindStore((s) => s.keybindMap);

  /** Timer */
  const { time, startTimer, stopTimer } = useTimer();

  /** Animation queue */
  const { queue: animationQueue, currentElem: currentMoveEvent } =
    useAnimationQueue<MoveEvent>(customAddToQueue);

  /** State manager */

  const { alg, applyMove, setAlg, resetCube } = useCubeStateManager(
    defaultPattern,
    scramble
  );

  const lastScrambleRef = useRef<string>(scramble);
  useEffect(() => {
    if (scramble != lastScrambleRef.current) {
      setAlg(scramble);
      lastScrambleRef.current = scramble;
    }
  }, [scramble, setAlg]);

  const handleKeyboardBoundMove = useCallback(
    (move: string) => {
      const timestamp = performance.now();

      const moveObj = new Move(move);
      const moveEvent = {
        move: moveObj,
        timestamp: timestamp,
      };
      const animationQueueAlg = new Alg(
        animationQueue.getAllItems().map((x) => x.move)
      ).concat([moveEvent.move]);

      /**
       * Current state =
       * initialState + alg + animation queue (including current elem) + new move
       */
      const moveSolvesCube = checkSolved(
        defaultPattern?.applyAlg(new Alg(alg).concat(animationQueueAlg))
      );

      animationQueue.enqueue(moveEvent);

      if (localSolveStatus === "IDLE") {
        if (!useInspection && !ROTATIONS.has(moveObj.quantum.family)) {
          updateLocalSolveStatus("TIMER_START");
          startTimer(timestamp);
        }
      } else if (localSolveStatus === "INSPECTING") {
        if (useInspection && !ROTATIONS.has(moveObj.quantum.family)) {
          finishInspection();
          startTimer(timestamp);
        }

        /**
         * Just tracing code logic, it's possible that moveSolvesCube is true here (aka the first move solves the cube)
         * While we should handle it gracefully, it's likely unintended behavior, so also error.
         */
        if (moveSolvesCube) {
          console.error(
            "First move after inspection solved cube! This should never happen."
          );
          onFinishTimer(0);
          return;
        }
      } else if (localSolveStatus === "SOLVING") {
        if (moveSolvesCube) {
          resetCube();
          onFinishTimer(stopTimer());
        }
      }
    },
    [
      animationQueue,
      defaultPattern,
      alg,
      localSolveStatus,
      useInspection,
      updateLocalSolveStatus,
      startTimer,
      finishInspection,
      resetCube,
      onFinishTimer,
      stopTimer,
    ]
  );

  const onFinishAnimating = useCallback(() => {
    if (!currentMoveEvent) return;

    animationQueue.completeCurrent();
    applyMove(currentMoveEvent.move);
  }, [applyMove, currentMoveEvent, animationQueue]);

  const timerElement = useMemo(() => {
    if (localSolveStatus === "IDLE") {
      return (
        <p className={cn("text-4xl font-bold", timerTextClassName)}>-.--</p>
      );
    } else if (localSolveStatus === "INSPECTING") {
      return (
        <InspectionCountdown
          remainingTime={inspectionTime}
          penalty={inspectionPenalty}
          className={cn("text-4xl", timerTextClassName)}
        />
      );
    } else if (
      localSolveStatus === "SUBMITTING" ||
      localSolveStatus === "FINISHED"
    ) {
      return <p className="text-4xl font-bold">{localResult.toString()}</p>;
    }
    return <p className="text-4xl font-bold">{Result.timeToString(time)}</p>;
  }, [
    localSolveStatus,
    time,
    timerTextClassName,
    inspectionTime,
    inspectionPenalty,
    localResult,
  ]);

  const resetButtonEnabled = useMemo(() => {
    // allow resetting whenever inErrorState and when in an IDLE, SUBMITTING, or SOLVED state
    return (
      inErrorState ||
      localSolveStatus === "IDLE" ||
      localSolveStatus === "SUBMITTING" ||
      localSolveStatus === "FINISHED"
    );
  }, [inErrorState, localSolveStatus]);

  const inDisabledState = useMemo(() => {
    return (
      localSolveStatus === "SUBMITTING" ||
      localSolveStatus === "FINISHED" ||
      (localSolveStatus === "IDLE" && useInspection)
    );
  }, [localSolveStatus, useInspection]);

  const displayAlg = useMemo(() => {
    return inDisabledState ? "" : alg;
  }, [alg, inDisabledState]);

  const VirtualCubeElement = useMemo(() => {
    return (
      <VirtualCube
        event={ROOM_EVENTS_INFO[event].jsName}
        viewerControlsEnabled={false}
        setupAlg=""
        alg={displayAlg}
        onError={() => {
          setInErrorState(true);
        }}
        onErrorClear={() => {
          setInErrorState(false);
        }}
        animationMove={currentMoveEvent?.move}
        animationDuration={currentMoveEvent?.duration}
        onFinishAnimating={onFinishAnimating}
      />
    );
  }, [event, displayAlg, currentMoveEvent, onFinishAnimating]);

  const helpTextElement = useMemo(() => {
    if (localSolveStatus === "SOLVING" || localSolveStatus === "SUBMITTING") {
      return null;
    } else if (localSolveStatus === "IDLE" && useInspection) {
      return <p>Press Space to start inspecting</p>;
    } else if (localSolveStatus === "FINISHED") {
      return <p>Waiting for others to finish</p>;
    }
    return <p>Do any move to start timer</p>;
  }, [localSolveStatus, useInspection]);

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex flex-row gap-2 justify-center">
        <div className="grow">{timerElement}</div>
        <Button
          variant="primary"
          disabled={!resetButtonEnabled}
          onClick={() => {
            resetCube();
          }}
        >
          Reset
        </Button>
      </div>
      <div
        className={cn(
          "h-60 w-full border border-3 border-black rounded-lg",
          inErrorState ? "bg-error/30 border-error" : "",
          inDisabledState ? "bg-container-3/30 border-container-3" : ""
        )}
      >
        {VirtualCubeElement}
      </div>
      <div className="flex flex-row justify-center">{helpTextElement}</div>
      <div className="flex flex-row justify-center">
        <CubeControls
          keybindMap={keybindMap}
          onExecuteMove={handleKeyboardBoundMove}
        />
        {localSolveStatus === "IDLE" && useInspection && (
          <KeyboardListenerKey
            visible={false}
            keyName="Space"
            onKeyDown={() => {
              setTimerTextClassName("text-timer-ready");
            }}
            onKeyUp={() => {
              setTimerTextClassName("");
              setAlg(scramble);
              startInspection();
            }}
          />
        )}
      </div>
    </div>
  );
}

function CubeControls({
  keybindMap,
  onExecuteMove,
}: {
  keybindMap: KeybindMap<string>;
  onExecuteMove?: (move: string) => void;
}) {
  const executeKeyboundMove = useCallback(
    (keyName: string) => {
      const mappedMove = keybindMap.get(keyName)?.keyBind;
      if (!mappedMove) return;

      onExecuteMove?.(mappedMove);
    },
    [onExecuteMove, keybindMap]
  );

  return (
    <>
      <div className="flex flex-row">
        <div className="grid grid-cols-10 grid-rows-4 gap-1">
          {[...keybindMap.keys()].map((key) => (
            <KeyboardListenerKey
              key={key}
              visible={false}
              keyName={keybindMap.get(key)?.keyCode ?? ""}
              onKeyDown={() => {
                executeKeyboundMove(key);
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
