"use client";
import Header from "@/components/common/header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TimerEvent, TimerState, useSmartTimer } from "@/lib/bluetooth";
import { Result } from "@/types/result";
import { useCallback, useState } from "react";

export default function Page() {
  const handleTimerEvent = useCallback((event: TimerEvent) => {
    switch (event.state) {
      case TimerState.HANDS_ON:
        setTimerTextClassName("text-timer-notready");
        break;
      case TimerState.GET_SET:
        setTimerTextClassName("text-timer-ready");
        break;
      case TimerState.STOPPED:
        setTimerTextClassName("text-timer-not-ready");
        break;
      case TimerState.DISCONNECT:
        toast.info("Bluetooth Timer disconnected");
        break;
      default:
        setTimerTextClassName("");
    }
  }, []);

  const {
    timerState,
    recordedTime,
    connected: timerConnected,
    connect: connectTimer,
    disconnect: disconnectTimer,
  } = useSmartTimer(handleTimerEvent);

  const [timerTextClassName, setTimerTextClassName] = useState<string>("");

  return (
    <div className="flex flex-col h-screen w-full">
      <Header>
        <div className="flex flex-row">
          <div className="flex-1">
            <p className="text-3xl font-bold text-center">
              Bluetooth Playground
            </p>
          </div>
        </div>
      </Header>
      <div className="flex flex-col h-full w-full py-3">
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
    </div>
  );
}
