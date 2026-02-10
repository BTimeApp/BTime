import type { KeybindMap } from "@/types/keybind";
import type { MoveEvent } from "@btime/bluetooth-cubing";
import type { Penalty } from "@btime/types";

import InspectionCountdown from "@/components/room/inspection-countdown";
import { Button } from "@/components/ui/button";
import { KeyboardListenerKey } from "@/components/virtual/keyboard-key";
import { useRoomStore } from "@/context/room-context";
import { useCubeStateManager } from "@/hooks/use-cube-state-manager";
import { useTimer } from "@/hooks/use-timer";
import { get3x3x3 } from "@/lib/get-kpuzzle";
import { cn } from "@/lib/utils";
import { useKeybindStore } from "@/stores/keybind-store";
import {
  DEFAULT_MOVE_EVENT_DURATION,
  SLOWEST_CONTINUOUS_MOVE_PAUSE,
  SLOWEST_MOVE_EVENT_DURATION,
} from "@/types/animation-constants";
import { Result } from "@btime/lib";
import { useAnimationQueue, VirtualCube } from "@btime/virtual-cubing-react";
import { Move } from "cubing/alg";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

function mergeMoveEvents(
  eventA: MoveEvent,
  eventB: MoveEvent
): MoveEvent | null {
  /**
   * Tries to merge two move events. If the events are incompatible, just returns null. A should have always occurred BEFORE B.
   *
   * Two criteria for merge-ability:
   *   1) stacking same move family
   *   2) moves happen close enough to each other to be feasible (most often seen by low timestamp diff)
   *
   * While I would like to implement simplifying into slice moves, it would require transforming other moves done after slice
   * moves to account for the absolute orientation given by bluetooth module.
   * e.g. in H perm, the U done after the the first M2 is actually read as a D/D' by the bluetooth module
   */

  const moveAFamily = eventA.move.quantum.family;
  const moveBFamily = eventB.move.quantum.family;

  if (
    moveAFamily == moveBFamily &&
    //move directions need to agree to be stackable
    eventA.move.amount * eventB.move.amount >= 0
  ) {
    if (eventA.duration != null) {
      if (
        eventB.timestamp - eventA.timestamp - eventA.duration <
        SLOWEST_CONTINUOUS_MOVE_PAUSE
      ) {
        return {
          move: new Move(moveAFamily, eventA.move.amount + eventB.move.amount),
          timestamp: eventA.timestamp,
          duration:
            eventB.timestamp -
            eventA.timestamp +
            (eventB.duration ?? DEFAULT_MOVE_EVENT_DURATION),
        };
      }
    } else if (
      eventB.timestamp - eventA.timestamp <=
      SLOWEST_MOVE_EVENT_DURATION
    ) {
      return {
        move: new Move(moveAFamily, eventA.move.amount + eventB.move.amount),
        timestamp: eventA.timestamp,
        duration:
          eventB.timestamp -
          eventA.timestamp +
          (eventB.duration ?? DEFAULT_MOVE_EVENT_DURATION),
      };
    }
  }

  return null;
}

const customAddToQueue = (
  queue: MoveEvent[],
  newElem: MoveEvent
): MoveEvent[] => {
  if (queue.length == 0) {
    return [newElem];
  }

  const ret = queue.slice();
  // update duration for last event if applicable

  const lastEvent = ret.at(-1)!;
  if (lastEvent.duration == null) {
    const elapsedTime = newElem.timestamp - lastEvent.timestamp;
    lastEvent.duration =
      elapsedTime < SLOWEST_MOVE_EVENT_DURATION
        ? elapsedTime
        : DEFAULT_MOVE_EVENT_DURATION;
  }

  let curr = newElem;

  let mergedEvent = mergeMoveEvents(lastEvent, curr);

  while (ret.length > 0 && mergedEvent != null) {
    ret.pop();
    curr = mergedEvent;
    if (ret.length > 0) {
      mergedEvent = mergeMoveEvents(ret.at(-1)!, curr);
    }
  }

  ret.push(curr);

  return ret;
};

const ROTATIONS = new Set<string>(["x", "y", "z"]);

type VirtualTimerProps = {
  scramble?: string;
  onFinishInspection?: (penalty: Penalty) => void;
  onFinishTimer: (timerValue: number) => void;
};

const kpuzzle333Promise = get3x3x3();
export default function VirtualTimer({
  scramble = "",
  onFinishInspection,
  onFinishTimer,
}: VirtualTimerProps) {
  const kpuzzle333 = use(kpuzzle333Promise);

  /** State */
  const localSolveStatus = useRoomStore((s) => s.localSolveStatus);
  const localResult = useRoomStore((s) => s.localResult);
  const useInspection = useRoomStore((s) => s.useInspection);
  const updateLocalSolveStatus = useRoomStore((s) => s.updateLocalSolveStatus);

  const [timerTextClassName, setTimerTextClassName] = useState<string>("");
  const [inErrorState, setInErrorState] = useState<boolean>(false);
  // const solveFirstMoveDoneRef = useRef<boolean>(false);

  /** Keybind map */
  const keybindMap = useKeybindStore((s) => s.keybindMap);

  /** Timer */
  const { time, startTimer, stopTimer } = useTimer();

  /** Animation queue */
  const {
    currentElem: currentMoveEvent,
    addToAnimationQueue,
    handleAnimationComplete,
    // clearAnimationQueue,
    // clearCurrentElem,
  } = useAnimationQueue<MoveEvent>(customAddToQueue);

  /** State manager */
  const onSolved = useCallback(() => {
    /**
     * The cube state manager will call this callback every time we enter a solved state.
     * We only care about when we're still solving.
     */
    if (localSolveStatus === "SOLVING") {
      onFinishTimer(stopTimer());
      updateLocalSolveStatus();
    }
  }, [localSolveStatus, onFinishTimer, stopTimer, updateLocalSolveStatus]);

  const {
    //kpattern,
    alg,
    // setupAlg,
    applyMove,
    setAlg,
    setSetupAlg,
  } = useCubeStateManager(kpuzzle333, onSolved);

  const lastScrambleRef = useRef<string>(scramble);

  useEffect(() => {
    if (scramble != lastScrambleRef.current) {
      setSetupAlg(scramble);
      lastScrambleRef.current = scramble;
    }
  }, [scramble, setSetupAlg]);

  const handleKeyboardBoundMove = useCallback(
    (move: string) => {
      const timestamp = performance.now();

      const moveObj = new Move(move);
      const moveEvent = {
        move: moveObj,
        timestamp: timestamp,
      };

      addToAnimationQueue(moveEvent);
      if (
        !useInspection && // drop moves if in IDLE and we use inspection!
        localSolveStatus === "IDLE" &&
        !ROTATIONS.has(moveObj.quantum.family)
      ) {
        startTimer(timestamp);
        updateLocalSolveStatus("TIMER_START");
      }
    },
    [
      addToAnimationQueue,
      updateLocalSolveStatus,
      startTimer,
      useInspection,
      localSolveStatus,
    ]
  );

  /**
   * TODO: consider removing this callback once productionizing this component
   */
  const handleStartInspection = useCallback(() => {
    if (localSolveStatus === "IDLE") {
      updateLocalSolveStatus();
    } else {
      toast.error(
        `Tried to start inspection when solve status was ${localSolveStatus}`
      );
    }
  }, [localSolveStatus, updateLocalSolveStatus]);

  const onFinishAnimating = useCallback(() => {
    if (!currentMoveEvent) return;

    handleAnimationComplete();
    applyMove(currentMoveEvent.move);
  }, [applyMove, currentMoveEvent, handleAnimationComplete]);

  const timerElement = useMemo(() => {
    if (localSolveStatus === "IDLE") {
      return (
        <p className={cn("text-4xl font-bold", timerTextClassName)}>-.--</p>
      );
    } else if (localSolveStatus === "INSPECTING") {
      return (
        <InspectionCountdown
          timerType="BLUETOOTHTIMER"
          onFinishInspection={(penalty: Penalty) => {
            onFinishInspection?.(penalty);
          }}
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
    localResult,
    onFinishInspection,
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

  const displaySetupAlg = useMemo(() => {
    return inDisabledState ? "" : scramble;
  }, [scramble, inDisabledState]);

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex flex-row gap-2 justify-center">
        <div className="grow">{timerElement}</div>
        <Button
          variant="primary"
          disabled={!resetButtonEnabled}
          onClick={() => {
            // TODO - handle reset correctly
            setAlg("");
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
        <VirtualCube
          event="3x3x3"
          viewerControlsEnabled={false}
          setupAlg={displaySetupAlg}
          alg={alg}
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
              handleStartInspection();
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
