import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IResult, Result } from "@/types/result";
import { ROOM_EVENT_JS_NAME_MAP, RoomEvent } from "@/types/room";
import React from "react";

type SolveDialogProps = {
  setIndex?: number;
  solveIndex: number;
  scramble: string;
  event: RoomEvent;
  result?: IResult;
  children: React.ReactNode;
};

export default function SolveDialog({
  setIndex,
  solveIndex,
  scramble,
  event,
  result,
  children,
}: SolveDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogTitle>
          {setIndex && `Set ${setIndex}`} {`Solve ${solveIndex}`}
        </DialogTitle>
        <div>
          {/* <scramble-display scramble={scramble} event={ROOM_EVENT_JS_NAME_MAP.get(event)}></scramble-display> */}
          <twisty-player
            experimental-setup-alg={scramble}
            puzzle={ROOM_EVENT_JS_NAME_MAP.get(event) ?? "3x3x3"}
            visualization="2D"
            control-panel="none"
            background="none"
          />
        </div>
        <div>{
          result && 
          Result.fromIResult(result).toString(true)+"\t"}{scramble}</div>
      </DialogContent>
    </Dialog>
  );
}
