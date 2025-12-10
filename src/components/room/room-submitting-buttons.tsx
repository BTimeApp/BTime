import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRoomStore } from "@/context/room-context";
import { useCallback, useEffect, useRef } from "react";
import { useSocket } from "@/context/socket-context";
import { SOCKET_CLIENT } from "@/types/socket_protocol";
import { KeybindButton } from "@/components/common/keybind-button";

function RoomSubmittingButtons() {
  const localResult = useRoomStore((s) => s.localResult);
  const resetLocalSolveStatus = useRoomStore((s) => s.resetLocalSolveStatus);
  const setLocalPenalty = useRoomStore((s) => s.setLocalPenalty);
  const updateLocalSolveStatus = useRoomStore((s) => s.updateLocalSolveStatus);
  const { socket } = useSocket();

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const submitLocalResult = useCallback(() => {
    socket.emit(SOCKET_CLIENT.SUBMIT_RESULT, localResult.toIResult(), () => {
      updateLocalSolveStatus("SUBMIT_TIME");
    });
  }, [socket, localResult, updateLocalSolveStatus]);

  useEffect(() => {
    if (submitButtonRef.current) submitButtonRef.current.focus();
  }, []);

  return (
    <div className="mx-auto flex flex-row justify-center gap-2 px-2">
      <Button variant="destructive" size="xs" onClick={resetLocalSolveStatus}>
        <h1 className={cn("font-bold text-center text-md")}>REDO</h1>
      </Button>
      <KeybindButton
        keys={["ctrl", "1"]}
        variant="destructive"
        size="xs"
        onClick={() => {
          setLocalPenalty("OK");
        }}
      >
        <h1 className={cn("font-bold text-center text-md")}>OK</h1>
      </KeybindButton>
      <KeybindButton
        keys={["ctrl", "2"]}
        variant="destructive"
        size="xs"
        onClick={() => {
          setLocalPenalty("+2");
        }}
      >
        <h1 className={cn("font-bold text-center text-md")}>+2</h1>
      </KeybindButton>
      <KeybindButton
        keys={["ctrl", "3"]}
        variant="destructive"
        size="xs"
        onClick={() => {
          setLocalPenalty("DNF");
        }}
      >
        <h1 className={cn("font-bold text-center text-md")}>DNF</h1>
      </KeybindButton>
      {/* <KeyListener
        keyName="Enter"
        onKeyDown={submitLocalResult}
        forceInitialValue={timerType ? (timerType === "TYPING" ? true : false) : undefined}
      > */}
      <Button
        variant="destructive"
        size="xs"
        onClick={submitLocalResult}
        ref={submitButtonRef}
      >
        <h1 className={cn("font-bold text-center text-md")}>SUBMIT</h1>
      </Button>
      {/* </KeyListener> */}
    </div>
  );
}

export default RoomSubmittingButtons;
