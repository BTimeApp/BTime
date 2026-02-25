import type { MoveEvent } from "@btime/bluetooth-cubing";
import type { Penalty } from "@btime/types";
import type { KPattern } from "cubing/kpuzzle";

import InspectionCountdown from "@/components/room/inspection-countdown";
import { Button } from "@/components/ui/button";
import { useRoomStore } from "@/context/room-context";
import {
  checkSolved,
  useCubeStateManager,
} from "@/hooks/use-cube-state-manager";
import { useInspectionCountdown } from "@/hooks/use-inspection-countdown";
import { useTimer } from "@/hooks/use-timer";
import { get3x3x3 } from "@/lib/get-kpuzzle";
import { cn } from "@/lib/utils";
import { useBluetoothCubeStore } from "@/stores/bluetooth-cube-store";
import {
  DEFAULT_MOVE_EVENT_DURATION,
  SLOWEST_CONTINUOUS_MOVE_PAUSE,
  SLOWEST_MOVE_EVENT_DURATION,
} from "@/types/animation-constants";
import { Result } from "@btime/lib";
import { useAnimationQueue, VirtualCube } from "@btime/virtual-cubing-react";
import { Alg, Move } from "cubing/alg";
import { cube3x3x3 } from "cubing/puzzles";
import {
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Quaternion } from "three";

enum ScrambleState {
  PRESCRAMBLE = 0,
  SCRAMBLING = 1,
  SCRAMBLED = 2,
}

function useLiveScrambleParts(
  scramble: string,
  scrambleState: ScrambleState,
  defaultPattern: KPattern,
  onFinishScramble?: () => void
) {
  const lastScrambleRef = useRef<string>("");
  const [completedScramble, setCompletedScramble] = useState<string>("");
  const [remainingScramble, setRemainingScramble] = useState<string>("");
  const executedMovesRef = useRef<string>("");
  const targetPatternRef = useRef<KPattern>(defaultPattern);

  const newScrambleEvent = useEffectEvent((newScramble: string) => {
    //reset internal state!
    setCompletedScramble("");
    setRemainingScramble(newScramble);
    executedMovesRef.current = "";
    targetPatternRef.current = defaultPattern.applyAlg(scramble);
  });
  useEffect(() => {
    if (scramble != lastScrambleRef.current) {
      lastScrambleRef.current = scramble;
      newScrambleEvent(scramble);
    }
  }, [scramble]);

  const applyMoveToScramble = useCallback(
    (newMove: string) => {
      if (scrambleState === ScrambleState.SCRAMBLING) {
        if (remainingScramble === "") {
          //splitting an empty string will always give [""], so guard against empty string explicitly
          onFinishScramble?.();
          return;
        }

        executedMovesRef.current = [executedMovesRef.current, newMove].join(
          " "
        );

        const remainingScrambleTokenized = remainingScramble.split(" ");

        const move = new Move(newMove);
        const currentRemainingMove = new Move(remainingScrambleTokenized[0]);

        // get the result of move' + currentRemainingMove.
        const currentMoveSequence = new Alg([move])
          .invert()
          .concat([currentRemainingMove])
          .experimentalSimplify({ cancel: true, puzzleLoader: cube3x3x3 });

        if (move.quantum.family != currentRemainingMove.quantum.family) {
          // case 1: we did a bad move.
          // update remaining scramble

          setRemainingScramble(
            [
              currentMoveSequence.toString(),
              ...remainingScrambleTokenized.slice(1),
            ].join(" ")
          );

          /**
           * Below code is meant for the strategy of "recalculating" the scramble to do to get to the intended scrambled state.
           * However, it is prohibitively slow if you mess up at the beginning.
           *
           * TODO figure out a faster method - might refer to cstimer.
           */
          //   if (badMovesRef.current >= 5) {
          //     //take all executed moves so far, reconcile against desired scrambled state with solveTwsearch.
          //     const executedPattern = defaultPattern.applyAlg(
          //       executedMovesRef.current
          //     );

          //     const newRemainingScramble = await experimentalSolveTwsearch(
          //       defaultPattern.kpuzzle,
          //       executedPattern,
          //       {
          //         generatorMoves: ["R", "L", "U", "D", "F", "B"],
          //         targetPattern: targetPatternRef.current,
          //       }
          //     );
          //     console.log("new remaining scramble!", newRemainingScramble);

          //     setCompletedScramble(""); //optional - remove if causing issues
          //     setRemainingScramble(newRemainingScramble.toString());
          //     badMovesRef.current = 0;
          //   } else {
          //     console.log(
          //       `New remaining scramble sequence: ${[
          //         currentMoveSequence.toString(),
          //         ...remainingScrambleTokenized.slice(1),
          //       ].join(" ")}`
          //     );
          //     setRemainingScramble(
          //       [
          //         currentMoveSequence.toString(),
          //         ...remainingScrambleTokenized.slice(1),
          //       ].join(" ")
          //     );
          //   }
        } else {
          if (currentMoveSequence.toString() === "") {
            //case 2: we did the exact correct move to finish the current move. append to completedscramble, pop from remainingscramble
            setCompletedScramble((completedScramble) =>
              [completedScramble, currentRemainingMove].join(" ")
            );
            const newRemainingScramble = [
              ...remainingScrambleTokenized.slice(1),
            ].join(" ");
            setRemainingScramble(newRemainingScramble);

            //check for finished scramble
            if (newRemainingScramble === "") {
              onFinishScramble?.();
            }
          } else {
            //case 3: executed the correct move family, but are not done yet. replace remainingscramble's first move with currentMoveSequence
            setRemainingScramble(
              [
                currentMoveSequence.toString(),
                ...remainingScrambleTokenized.slice(1),
              ].join(" ")
            );
          }
        }
      }
    },
    [scrambleState, remainingScramble, onFinishScramble]
  );

  const reset = useCallback(() => {
    lastScrambleRef.current = scramble;
    targetPatternRef.current = defaultPattern.applyAlg(scramble);
    setCompletedScramble("");
    setRemainingScramble(scramble);

    executedMovesRef.current = "";
  }, [scramble, defaultPattern]);

  return {
    completedScramble,
    remainingScramble,
    applyMoveToScramble,
    resetScrambleParts: reset,
  };
}

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
  if (!newElem.duration) {
    if (queue.length == 0) {
      newElem.duration = DEFAULT_MOVE_EVENT_DURATION;
    } else if (
      newElem.timestamp - queue.at(-1)!.timestamp <=
      SLOWEST_MOVE_EVENT_DURATION
    ) {
      newElem.duration = newElem.timestamp - queue.at(-1)!.timestamp;
    } else {
      newElem.duration = DEFAULT_MOVE_EVENT_DURATION;
    }
  }

  if (queue.length == 0) {
    return [newElem];
  }

  const ret = queue.slice();
  let curr = newElem;

  let mergedEvent = mergeMoveEvents(ret.at(-1)!, curr);

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

type BluetoothCubeTimerProps = {
  scramble?: string;
  onFinishInspection?: (penalty: Penalty) => void;
  onFinishTimer: (timerValue: number) => void;
};

const kpuzzle333Promise = get3x3x3();
export default function BluetoothCubeTimer({
  scramble = "",
  onFinishInspection,
  onFinishTimer,
}: BluetoothCubeTimerProps) {
  const defaultPattern333 = use(kpuzzle333Promise).defaultPattern();

  /** State */
  const localSolveStatus = useRoomStore((s) => s.localSolveStatus);
  const localResult = useRoomStore((s) => s.localResult);
  const useInspection = useRoomStore((s) => s.useInspection);
  const updateLocalSolveStatus = useRoomStore((s) => s.updateLocalSolveStatus);
  const resetLocalSolveStatus = useRoomStore((s) => s.resetLocalSolveStatus);

  const [inErrorState, setInErrorState] = useState<boolean>(false);

  // necessary to keep two extra refs - one to tell us if we've finished the scramble, one to tell us if we've made the first move of the solve
  const [scrambleState, setScrambleState] = useState<ScrambleState>(
    ScrambleState.PRESCRAMBLE
  );
  const lastScrambleRef = useRef<string>("");

  /** Timer */
  const { time, startTimer, stopTimer } = useTimer();

  const finishInspectionWrapper = useCallback(
    (penalty: Penalty) => {
      onFinishInspection?.(penalty);
      startTimer();
    },
    [onFinishInspection, startTimer]
  );

  const {
    time: inspectionTime,
    startInspection,
    finishInspection,
    inspectionPenalty,
  } = useInspectionCountdown(updateLocalSolveStatus, finishInspectionWrapper);

  const onFinishScramble = useCallback(() => {
    setScrambleState(ScrambleState.SCRAMBLED);
    if (useInspection) {
      startInspection();
    }
  }, [useInspection, startInspection]);

  const {
    completedScramble,
    remainingScramble,
    applyMoveToScramble,
    resetScrambleParts,
  } = useLiveScrambleParts(
    scramble,
    scrambleState,
    defaultPattern333,
    onFinishScramble
  );

  /** Animation queue */
  const { queue: animationQueue, currentElem: currentMoveEvent } =
    useAnimationQueue<MoveEvent>(customAddToQueue);

  /** State manager */

  const [
    connected,
    // cube,
    bluetoothCubeInitialState,
    // initialStateInitialized,
    orientation,
    moveCallbackRef,
    connect,
    sync,
    disconnect,
  ] = useBluetoothCubeStore((s) => [
    s.connected,
    // s.cube,
    s.initialState,
    // s.initialStateInitialized,
    s.orientation,
    s.moveCallbackRef,
    s.connect,
    s.sync,
    s.disconnect,
  ]);

  /**
   * We cannot change the initial state of the bluetooth module.
   * However, we would like to modify the initial state (according to cube state manager) to be solved whenever we solve the puzzle.
   * On top of this, we would still like to reactively update our tracked initial state whenever the bluetooth module updates it (i.e. during a sync).
   *
   * To make this work, the responsibility for bridging this gap will fall on this integration component.
   */
  const [initialState, setInitialState] = useState<KPattern | undefined>(
    bluetoothCubeInitialState
  );
  const lastInitialStateRef = useRef<KPattern>(initialState);

  const newBluetoothCubeInitialStateEvent = useEffectEvent(
    (newBluetoothCubeInitialState: KPattern | undefined) => {
      if (localSolveStatus === "IDLE") {
        if (checkSolved(newBluetoothCubeInitialState)) {
          setScrambleState(ScrambleState.SCRAMBLING);
        } else {
          setScrambleState(ScrambleState.PRESCRAMBLE);
        }
      }
    }
  );
  useEffect(() => {
    if (
      (lastInitialStateRef.current == null &&
        bluetoothCubeInitialState != null) ||
      (lastInitialStateRef.current != null &&
        bluetoothCubeInitialState == null) ||
      (lastInitialStateRef.current != null &&
        bluetoothCubeInitialState != null &&
        !lastInitialStateRef.current.isIdentical(bluetoothCubeInitialState))
    ) {
      newBluetoothCubeInitialStateEvent(bluetoothCubeInitialState);
      setInitialState(bluetoothCubeInitialState);
      lastInitialStateRef.current = bluetoothCubeInitialState;
    }
  }, [bluetoothCubeInitialState]);

  const lastConnectedRef = useRef<boolean>(connected);

  const { alg, setAlg, applyMove, resetCube } = useCubeStateManager(
    initialState // use cube's initial state, or solved 333
    // do NOT pass in scramble - we want to match cube state.
  );

  /**
   * Updates to scramble state SCRAMBLING if we receive a new scramble while already solved.
   * TODO figure out a better pattern for this.
   */
  const newScrambleEvent = useEffectEvent(() => {
    //only update if initial state initialized!
    if (localSolveStatus === "IDLE" && initialState) {
      if (checkSolved(initialState)) {
        setScrambleState(ScrambleState.SCRAMBLING);
      } else {
        setScrambleState(ScrambleState.PRESCRAMBLE);
      }
    }
  });

  useEffect(() => {
    if (scramble != lastScrambleRef.current) {
      newScrambleEvent();
      lastScrambleRef.current = scramble;
    }
  }, [scramble]);

  const onDisconnectEvent = useEffectEvent(() => {
    setInitialState(undefined);
    resetCube();
    setScrambleState(ScrambleState.PRESCRAMBLE);
    animationQueue.clear();
    resetScrambleParts();
    resetLocalSolveStatus();
  });

  useEffect(() => {
    if (connected != lastConnectedRef.current) {
      if (!connected) {
        onDisconnectEvent();
      }
      lastConnectedRef.current = connected;
    }
  }, [connected]);

  const resetInitialStateAndClearQueue = useCallback(() => {
    setInitialState(defaultPattern333); //manually set to solved state! only use this callback when live connection
    setAlg("");
    animationQueue.clear();
  }, [animationQueue, setAlg, defaultPattern333]);

  // eslint-disable-next-line react-hooks/refs
  moveCallbackRef.current = useCallback(
    (moveEvent: MoveEvent) => {
      const animationQueueAlg = new Alg(
        animationQueue.getAllItems().map((x) => x.move)
      ).concat([moveEvent.move]);

      /**
       * Current state =
       * initialState + alg + animation queue (including current elem) + new move
       */
      const moveSolvesCube = checkSolved(
        initialState?.applyAlg(new Alg(alg).concat(animationQueueAlg))
      );

      if (localSolveStatus === "IDLE") {
        switch (scrambleState) {
          case ScrambleState.PRESCRAMBLE:
            if (moveSolvesCube) {
              resetInitialStateAndClearQueue();
              resetScrambleParts();
              setScrambleState(ScrambleState.SCRAMBLING);
              return;
            }
            break;
          case ScrambleState.SCRAMBLING:
            if (moveSolvesCube) {
              resetInitialStateAndClearQueue();
              resetScrambleParts();
              return;
            }
            applyMoveToScramble(moveEvent.move.toString());
            break;
          case ScrambleState.SCRAMBLED:
            if (!useInspection) {
              updateLocalSolveStatus("TIMER_START");
              startTimer();
            }
            break;
          default:
            console.warn(
              `Illegal scramble state encountered: ${scrambleState}`
            );
        }
      } else if (localSolveStatus === "INSPECTING") {
        finishInspection();
        /**
         * Just tracing code logic, it's possible that moveSolvesCube is true here (aka the first move solves the cube)
         * While we should handle it gracefully, it's likely unintended behavior, so also error.
         */
        if (moveSolvesCube) {
          console.error(
            "First move after inspection solved cube! This should never happen."
          );
          resetInitialStateAndClearQueue();
          setScrambleState(ScrambleState.PRESCRAMBLE);
          onFinishTimer(0);
          return;
        }
      } else if (localSolveStatus === "SOLVING") {
        if (moveSolvesCube) {
          resetInitialStateAndClearQueue();
          setScrambleState(ScrambleState.PRESCRAMBLE);

          onFinishTimer(stopTimer());
          return;
        }
      }

      animationQueue.enqueue(moveEvent);
    },
    [
      animationQueue,
      initialState,
      alg,
      localSolveStatus,
      scrambleState,
      applyMoveToScramble,
      useInspection,
      resetInitialStateAndClearQueue,
      resetScrambleParts,
      updateLocalSolveStatus,
      finishInspection,
      onFinishTimer,
      stopTimer,
    ]
  );

  const onFinishAnimating = useCallback(() => {
    const currentMoveEvent = animationQueue.getCurrent();
    if (!currentMoveEvent) {
      return;
    }

    const moveToApply = currentMoveEvent.move;

    // note: handling reset upon solve is managed by an effect right now.
    // while not the cleanest possible solution, it's a shared pattern with other timer component implementations
    animationQueue.completeCurrent();
    applyMove(moveToApply);
  }, [animationQueue, applyMove]);

  const handleSync = useCallback(async () => {
    try {
      await sync();
      animationQueue.clear();
      setAlg("");
    } catch (err) {
      toast.error((err as Error)?.message ?? "Error during synchronizing");
    }
  }, [sync, setAlg, animationQueue]);

  const timerElement = useMemo(() => {
    if (localSolveStatus === "IDLE") {
      switch (scrambleState) {
        case ScrambleState.PRESCRAMBLE:
          return <p className="text-xl">Solve cube to start scrambling</p>;
        case ScrambleState.SCRAMBLING:
          return (
            <p className="text-xl">
              <span className="blur-xs">{completedScramble}</span>{" "}
              <span className="font-bold">
                {remainingScramble.split(" ")[0] ?? ""}
              </span>{" "}
              {remainingScramble.split(" ").slice(1).join(" ")}
            </p>
          );
        case ScrambleState.SCRAMBLED:
          // consider returning null
          return <p className="text-lg">Do any move to start solve</p>;
        default:
          console.error(`Encountered illegal scramble state: ${scrambleState}`);
          return null;
      }
    } else if (localSolveStatus === "INSPECTING") {
      return (
        <InspectionCountdown
          remainingTime={inspectionTime}
          penalty={inspectionPenalty}
          className={"text-4xl"}
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
    scrambleState,
    completedScramble,
    remainingScramble,
    inspectionTime,
    inspectionPenalty,
    localResult,
  ]);

  const VirtualCubeElement = useMemo(() => {
    return (
      <VirtualCube
        event="3x3x3"
        viewerControlsEnabled={false}
        initialState={initialState}
        orientation={
          new Quaternion(
            orientation.x,
            orientation.y,
            orientation.z,
            orientation.w
          )
        }
        setupAlg=""
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
    );
  }, [alg, initialState, orientation, currentMoveEvent, onFinishAnimating]);

  const helpTextElement = useMemo(() => {
    if (localSolveStatus === "SOLVING" || localSolveStatus === "SUBMITTING") {
      return null;
    } else if (localSolveStatus === "FINISHED") {
      return <p>Waiting for others to finish</p>;
    }
  }, [localSolveStatus]);

  if (!connected) {
    return (
      <div className="flex flex-col text-center items-center">
        <div>Click button to connect to Bluetooth Cube.</div>
        <Button
          variant="primary"
          className="w-fit"
          onClick={async () => {
            try {
              await connect(() => {
                toast.success(`Succesfully connected to bluetooth timer!`);
              });
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
        >
          Connect
        </Button>
        <div>
          Supported cubes:
          <ul>
            <li>Moyu32 cubes: WCU-MY3...</li>
            <li>GAN cubes (v2-v4 protocol)</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex flex-row gap-2">
        <div className="grow">{timerElement}</div>
        <Button
          variant="primary"
          onClick={async () => {
            await handleSync();
          }}
          className="ml-auto"
        >
          Sync
        </Button>
      </div>
      <div
        className={cn(
          "h-60 w-full border border-3 border-black rounded-lg",
          inErrorState ? "bg-error/30 border-error" : ""
        )}
      >
        {VirtualCubeElement}
      </div>
      <div className="flex flex-row gap-2">
        <div className="grow">{helpTextElement}</div>
        <Button
          variant="reset"
          className="w-fit"
          onClick={async () => {
            try {
              await disconnect();
              toast.info("Disconnected from bluetooth cube.");
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
        >
          Disconnect
        </Button>
      </div>
    </div>
  );
}
