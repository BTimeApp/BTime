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
  SLOWEST_MOVE_EVENT_DURATION,
} from "@/types/animation-constants";
import { Result } from "@btime/lib";
import { useAnimationQueue, VirtualCube } from "@btime/virtual-cubing-react";
import { Move } from "cubing/alg";
import {
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";

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

  /** Keybind map */
  const keybindMap = useKeybindStore((s) => s.keybindMap);

  /** Timer */
  const { time, startTimer, stopTimer } = useTimer();

  /** Animation queue */
  const {
    currentElem: currentMoveEvent,
    addToAnimationQueue,
    handleAnimationComplete,
  } = useAnimationQueue<MoveEvent>(customAddToQueue);

  /** State manager */

  const { alg, isSolved, applyMove, setAlg, resetCube } = useCubeStateManager(
    kpuzzle333,
    scramble
  );

  const onSolvedEvent = useEffectEvent(() => {
    /**
     * The cube state manager will call this callback every time we enter a solved state.
     * We only care about when we're still solving.
     */
    if (localSolveStatus === "SOLVING") {
      resetCube();
      onFinishTimer(stopTimer());
      updateLocalSolveStatus();
    }
  });

  useEffect(() => {
    if (isSolved) {
      onSolvedEvent();
    }
  }, [isSolved]);

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

      addToAnimationQueue(moveEvent);
      if (
        ((!useInspection && localSolveStatus === "IDLE") ||
          (useInspection && localSolveStatus === "INSPECTING")) &&
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
          timerType="VIRTUAL"
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

  const displayAlg = useMemo(() => {
    return inDisabledState ? "" : alg;
  }, [alg, inDisabledState]);

  const VirtualCubeElement = useMemo(() => {
    return (
      <VirtualCube
        event="3x3x3"
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
  }, [displayAlg, currentMoveEvent, onFinishAnimating]);

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
              updateLocalSolveStatus();
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
