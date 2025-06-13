import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import KeyListener from "../common/key-listener";
import { TimerType } from "@/types/timerType";

type RoomSubmittingButtonsProps = {
  redoSolveCallback: () => void;
  okPenaltyCallback: () => void;
  plusTwoPenaltyCallback: () => void;
  dnfPenaltyCallback: () => void;
  submitResultCallback: () => void;
  timerType?: TimerType; //only used for workaround for enter press detection - remove if implementing global key listener
};

function RoomSubmittingButtons({
    redoSolveCallback,
    okPenaltyCallback,
    plusTwoPenaltyCallback,
    dnfPenaltyCallback,
    submitResultCallback,
    timerType
}: RoomSubmittingButtonsProps) {
  return (
    <div className="mx-auto flex flex-row gap-2 px-2">
      <Button
        variant="destructive"
        size="xs"
        onClick={redoSolveCallback}
      >
        <h1 className={cn("font-bold text-center text-md")}>REDO</h1>
      </Button>
      <Button
        variant="destructive"
        size="xs"
        onClick={okPenaltyCallback}
      >
        <h1 className={cn("font-bold text-center text-md")}>OK</h1>
      </Button>
      <Button
        variant="destructive"
        size="xs"
        onClick={plusTwoPenaltyCallback}
      >
        <h1 className={cn("font-bold text-center text-md")}>+2</h1>
      </Button>
      <Button
        variant="destructive"
        size="xs"
        onClick={dnfPenaltyCallback}
      >
        <h1 className={cn("font-bold text-center text-md")}>DNF</h1>
      </Button>
      <KeyListener
        keyName="Enter"
        onKeyDown={submitResultCallback}
        forceInitialValue={timerType ? (timerType === "TYPING" ? true : false) : undefined}
      >
        <Button
            variant="destructive"
            size="xs"
            onClick={submitResultCallback}
        >
            <h1 className={cn("font-bold text-center text-md")}>SUBMIT</h1>
        </Button>
      </KeyListener>
    </div>
  );
}

export default RoomSubmittingButtons;