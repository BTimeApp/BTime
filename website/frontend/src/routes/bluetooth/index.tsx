import type {
  CubeMoveEventListener,
  MoveEvent,
  TimerEvent,
} from "@btime/bluetooth-cubing";

import { Header, HeaderTitle } from "@/components/common/header";
import PageWrapper from "@/components/common/page-wrapper";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TimerState } from "@btime/bluetooth-cubing";
import {
  useBluetoothCube,
  useBluetoothTimer,
} from "@btime/bluetooth-cubing-react";
import { Result } from "@btime/lib";
import { useAnimationQueue, VirtualCube } from "@btime/virtual-cubing-react";
import { createFileRoute } from "@tanstack/react-router";
import { Move } from "cubing/alg";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Quaternion } from "three";

export const Route = createFileRoute("/bluetooth/")({
  component: BluetoothPage,
});

const DEFAULT_MOVE_EVENT_DURATION = 70;
const SLOWEST_MOVE_EVENT_DURATION = 300;
const SLOWEST_CONTINUOUS_MOVE_PAUSE = 25;

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
  } = useAnimationQueue<MoveEvent>(customAddToQueue);

  const [alg, setAlg] = useState<string>("");

  //TODO: add duration to animation queue
  const handleMoveEvent: CubeMoveEventListener = useCallback(
    (moveEvent: MoveEvent) => {
      addToAnimationQueue(moveEvent);
    },
    [addToAnimationQueue]
  );

  const onFinishAnimating = useCallback(() => {
    setAlg(
      (alg) =>
        alg + (currentMoveEvent ? " " + currentMoveEvent.move.toString() : "")
    );
    handleAnimationComplete();
  }, [currentMoveEvent, handleAnimationComplete]);

  const {
    // cube,
    connected: cubeConnected,
    initialState,
    orientation,
    connect: connectCube,
    sync: syncCube,
    disconnect: disconnectCube,
  } = useBluetoothCube(handleMoveEvent);

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
                <div className={cn("h-60 w-full border border-3 rounded-lg")}>
                  <VirtualCube
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
                      try {
                        await syncCube();
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
                </div>
              </div>
            ) : (
              <div className="flex flex-col text-center items-center">
                <div>
                  Click button to connect to Bluetooth Cube. Only Moyu32
                  (WCU-...) cubes supported for now.
                </div>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
