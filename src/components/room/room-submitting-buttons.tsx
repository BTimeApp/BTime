import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRoomStore } from "@/context/room-context";
import { useCallback, useEffect, useRef } from "react";
import { useSocket } from "@/context/socket-context";

function RoomSubmittingButtons() {
  const [localResult, resetLocalSolveStatus, setLocalPenalty, updateLocalSolveStatus] = useRoomStore((s) => [s.localResult, s.resetLocalSolveStatus, s.setLocalPenalty, s.updateLocalSolveStatus]);
  const { socket } = useSocket();

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const submitLocalResult = useCallback(() => {
    updateLocalSolveStatus("SUBMIT_TIME");
    socket.emit("user_submit_result", localResult.toIResult());
  }, [socket, localResult, updateLocalSolveStatus]);


  useEffect(() => {
    if (submitButtonRef.current) submitButtonRef.current.focus();
  }, []);

  return (
    <div className="mx-auto flex flex-row gap-2 px-2">
      <Button
        variant="destructive"
        size="xs"
        onClick={resetLocalSolveStatus}
      >
        <h1 className={cn("font-bold text-center text-md")}>REDO</h1>
      </Button>
      <Button
        variant="destructive"
        size="xs"
        onClick={() => {setLocalPenalty("OK")}}
      >
        <h1 className={cn("font-bold text-center text-md")}>OK</h1>
      </Button>
      <Button
        variant="destructive"
        size="xs"
        onClick={() => {setLocalPenalty("+2")}}
      >
        <h1 className={cn("font-bold text-center text-md")}>+2</h1>
      </Button>
      <Button
        variant="destructive"
        size="xs"
        onClick={() => {setLocalPenalty("DNF")}}
      >
        <h1 className={cn("font-bold text-center text-md")}>DNF</h1>
      </Button>
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