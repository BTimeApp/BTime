import type {
  CubeMoveEventListener,
  MoveEvent,
  TimerEvent,
} from "@btime/bluetooth-cubing";

import { Header, HeaderTitle } from "@/components/common/header";
import PageWrapper from "@/components/common/page-wrapper";
import { Button } from "@/components/ui/button";
import { useTimer } from "@/hooks/use-timer";
import { cn } from "@/lib/utils";
import { TimerState } from "@btime/bluetooth-cubing";
import {
  useBluetoothCube,
  useBluetoothTimer,
} from "@btime/bluetooth-cubing-react";
import { Result } from "@btime/lib";
import { useAnimationQueue, VirtualCube } from "@btime/virtual-cubing-react";
import { createFileRoute } from "@tanstack/react-router";
import { Alg, Move } from "cubing/alg";
import { cube3x3x3 } from "cubing/puzzles";
import { randomScrambleForEvent } from "cubing/scramble";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Quaternion } from "three";

export const Route = createFileRoute("/bluetooth/")({
  component: BluetoothPage,
});

const DEFAULT_MOVE_EVENT_DURATION = 70;
const SLOWEST_MOVE_EVENT_DURATION = 300;
const SLOWEST_CONTINUOUS_MOVE_PAUSE = 25;

enum SolveStates {
  IDLE = 0,
  SCRAMBLING = 1,
  INSPECTING = 2,
  SOLVING = 3,
  FINISHED = 4,
}

const ROTATIONS = new Set<string>(["x", "y", "z"]);

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

function BluetoothPage() {
  const [timerTextClassName, setTimerTextClassName] = useState<string>("");

  const handleTimerEvent = useCallback((event: TimerEvent) => {
    switch (event.state) {
      case TimerState.HANDS_ON: {
        setTimerTextClassName("text-timer-notready");
        break;
      }
      case TimerState.GET_SET: {
        setTimerTextClassName("text-timer-ready");
        break;
      }
      case TimerState.STOPPED: {
        setTimerTextClassName("text-timer-not-ready");
        break;
      }
      case TimerState.DISCONNECT: {
        toast.info("Bluetooth Timer disconnected");
        break;
      }
      default: {
        setTimerTextClassName("");
      }
    }
  }, []);

  const {
    timerState,
    recordedTime,
    connected: timerConnected,
    connect: connectTimer,
    disconnect: disconnectTimer,
  } = useBluetoothTimer(handleTimerEvent);

  const {
    currentElem: currentMoveEvent,
    addToAnimationQueue,
    handleAnimationComplete,
    clearAnimationQueue,
    clearCurrentElem,
  } = useAnimationQueue<MoveEvent>(customAddToQueue);

  const {
    time,
    startTimer,
    stopTimer,
    //no isRunning here - the solveState makes it redundant
  } = useTimer();

  const [solveState, setSolveState] = useState<SolveStates>(SolveStates.IDLE);
  const [scramble, setScramble] = useState<Alg>(new Alg(""));
  const scrambleText = useMemo(() => scramble.toString(), [scramble]);
  const [alg, setAlg] = useState<string>("");
  const solveFirstMoveDoneRef = useRef<boolean>(false);

  const [latestTime, setLatestTime] = useState<number>(0);

  const generateScramble = useCallback(async () => {
    const scrambleAlg = await randomScrambleForEvent("333");
    return scrambleAlg.toString();
  }, []);

  const handleScramble = useCallback(async () => {
    const scramble = await generateScramble();
    setScramble(new Alg(scramble));
    if (solveState === SolveStates.IDLE) {
      setSolveState(SolveStates.SCRAMBLING);
    }
  }, [solveState, generateScramble]);

  /**
   * Handles new move events from cube (enqueueing)
   */
  const handleMoveEvent: CubeMoveEventListener = useCallback(
    (moveEvent: MoveEvent) => {
      if (
        solveState === SolveStates.INSPECTING &&
        !ROTATIONS.has(moveEvent.move.quantum.family) &&
        !solveFirstMoveDoneRef.current
      ) {
        setSolveState(SolveStates.SOLVING);
        startTimer();
        solveFirstMoveDoneRef.current = true;
      }
      addToAnimationQueue(moveEvent);
    },
    [solveState, startTimer, addToAnimationQueue]
  );

  const handleSolvedCallback = useCallback(() => {
    if (solveState === SolveStates.SOLVING) {
      setLatestTime(stopTimer());

      setSolveState(SolveStates.IDLE);
      solveFirstMoveDoneRef.current = false;
    }
  }, [solveState, stopTimer]);

  const {
    // cube,
    solved: isSolved,
    connected: cubeConnected,
    initialState,
    orientation,
    connect: connectCube,
    sync: syncCube,
    disconnect: disconnectCube,
  } = useBluetoothCube(
    handleMoveEvent,
    undefined,
    undefined,
    handleSolvedCallback
  );

  const handleSync = useCallback(async () => {
    try {
      await syncCube();
      clearAnimationQueue();
      clearCurrentElem();
      setAlg("");
    } catch (err) {
      toast.error((err as Error)?.message ?? "Error during synchronizing");
    }
  }, [syncCube, clearAnimationQueue, clearCurrentElem]);

  const onFinishAnimating = useCallback(() => {
    if (currentMoveEvent) {
      if (solveState === SolveStates.SCRAMBLING) {
        const newScramble = new Alg([currentMoveEvent.move])
          .invert()
          .concat(scramble)
          .experimentalSimplify({ cancel: true, puzzleLoader: cube3x3x3 });

        if (newScramble.toString() === "") {
          setSolveState(SolveStates.INSPECTING);
        }
        setScramble(newScramble);
      }

      // TODO - we actually dont want to reset the alg when solveState isn't updating to IDLE (it was alr idle)
      if (isSolved && solveState === SolveStates.FINISHED) {
        setAlg("");
        setSolveState(SolveStates.IDLE);
      } else {
        setAlg((alg) => alg + " " + currentMoveEvent.move.toString());
      }

      handleAnimationComplete();
    }
  }, [
    currentMoveEvent,
    scramble,
    solveState,
    isSolved,
    handleAnimationComplete,
  ]);

  return (
    <PageWrapper>
      <Header>
        <HeaderTitle title="Bluetooth Playground" />
      </Header>
      <div className="h-full w-full grid grid-cols-2">
        <div className="flex flex-col h-full py-3">
          <div className="flex flex-row justify-center">
            {!timerConnected && (
              <div className="flex flex-col text-center items-center">
                <div>
                  Click button to connect to Bluetooth Timer. Only GAN Timer
                  supported for now.
                </div>
                <Button
                  variant="primary"
                  className="w-fit"
                  onClick={async () => {
                    try {
                      await connectTimer(() => {
                        toast.success(
                          `Succesfully connected to bluetooth timer!`
                        );
                      });
                    } catch (err) {
                      toast.error((err as Error).message);
                    }
                  }}
                >
                  Connect
                </Button>
              </div>
            )}

            {timerConnected && (
              <div className="flex flex-col text-lg">
                <p className={timerTextClassName}>
                  Timer State: {TimerState[timerState]}
                </p>
                <p>
                  Currently Recorded Time:{" "}
                  {new Result(Math.floor(recordedTime / 10)).toString()}
                </p>
                <Button
                  variant="primary"
                  onClick={async () => {
                    try {
                      disconnectTimer();
                    } catch (err) {
                      toast.error((err as Error).message);
                    }
                  }}
                >
                  Disconnect
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col h-full py-3">
          <div className="flex flex-row justify-center">
            {cubeConnected ? (
              <div className="flex flex-col text-lg gap-2">
                <div className="flex flex-row gap-2">
                  <div className="text-wrap text-2xl text-center w-full">
                    {(() => {
                      switch (solveState) {
                        case SolveStates.IDLE:
                          return <p>{Result.timeToString(latestTime)}</p>;
                        case SolveStates.SCRAMBLING:
                          return (
                            <>
                              <span className="font-bold">
                                {scrambleText.split(" ")[0]}
                              </span>{" "}
                              {scrambleText.includes(" ") &&
                                scrambleText.split(" ").slice(1).join(" ")}
                            </>
                          );
                        case SolveStates.INSPECTING:
                          return <p>Solve!</p>;
                        case SolveStates.SOLVING:
                          return <p>{Result.timeToString(time)}</p>;
                        default:
                          return null;
                      }
                    })()}
                  </div>
                </div>
                <div className={cn("h-60 w-full border border-3 rounded-lg")}>
                  <VirtualCube
                    viewerControlsEnabled={false}
                    initialState={initialState}
                    setupAlg=""
                    alg={alg}
                    orientation={
                      new Quaternion(
                        orientation.x,
                        orientation.y,
                        orientation.z,
                        orientation.w
                      )
                    }
                    animationMove={currentMoveEvent?.move}
                    animationStart={currentMoveEvent?.timestamp}
                    animationDuration={currentMoveEvent?.duration}
                    onFinishAnimating={onFinishAnimating}
                  />
                </div>
                <div className="flex flex-row gap-2">
                  <Button
                    variant="primary"
                    onClick={async () => {
                      await handleScramble();
                    }}
                    disabled={!isSolved}
                  >
                    New Scramble
                  </Button>

                  <Button
                    variant="primary"
                    onClick={async () => {
                      try {
                        await handleSync();
                        toast.info("Synchronizing Cube");
                      } catch (err) {
                        toast.error((err as Error).message);
                      }
                    }}
                  >
                    Sync Cube
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={async () => {
                      try {
                        disconnectCube();
                      } catch (err) {
                        toast.error((err as Error).message);
                      }
                    }}
                  >
                    Disconnect
                  </Button>

                  <p className="ml-auto">
                    Solve State: {SolveStates[solveState]}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col text-center items-center">
                <div>Click button to connect to Bluetooth Cube.</div>
                <Button
                  variant="primary"
                  className="w-fit"
                  onClick={async () => {
                    try {
                      await connectCube(() => {
                        toast.success(
                          `Succesfully connected to bluetooth timer!`
                        );
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
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
