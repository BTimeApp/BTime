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
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Quaternion } from "three";

export const Route = createFileRoute("/bluetooth/")({
  component: BluetoothPage,
});

// const DEFAULT_MOVE_EVENT_DURATION = 70;
// const SLOWEST_MOVE_EVENT_DURATION = 300;

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
  } = useAnimationQueue<MoveEvent>();

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
    disconnect: disconnectCube,
  } = useBluetoothCube(handleMoveEvent);

  // const customAddToQueue = useCallback(
  //   (queue: MoveEvent[], newElem: MoveEvent): MoveEvent[] => {
  //     if (!newElem.duration) {
  //       if (queue.length == 0) {
  //         newElem.duration = DEFAULT_MOVE_EVENT_DURATION;
  //       } else if (newElem.timestamp - queue.at(-1)!.timestamp <= SLOWEST_MOVE_EVENT_DURATION) {
  //         newElem.duration = newElem.timestamp - queue.at(-1)!.timestamp;
  //       } else {
  //         newElem.duration = DEFAULT_MOVE_EVENT_DURATION;
  //       }
  //     }

  //     if (queue.length == 0) {
  //       return [newElem];
  //     }

  //     function getMoveEventsSimplified(eventA: MoveEvent, eventB: MoveEvent): MoveEvent | null {

  //     }

  //     const ret = queue.slice();
  //     let tempMove = newElem;

  //     // const moveFamily =
  //     //   cube?.state.kpuzzle?.definition.derivedMoves?.[
  //     //     newElem.move.quantum.family
  //     //   ] ?? newElem.move.quantum.family;

  //     //default return
  //     return ret;
  //   },
  //   [cube]
  // );

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
              <div className="flex flex-col text-lg">
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
                    //TODO - figure out why onError and onErrorClear show up here :/
                    onError={undefined}
                    onErrorClear={undefined}
                    animationMove={currentMoveEvent?.move}
                    onFinishAnimating={onFinishAnimating}
                  />
                </div>
                <Button
                  variant="primary"
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
