import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ROOM_EVENT_JS_NAME_MAP, RoomEvent } from "@/types/room";
import React from "react";

type SolveDialogProps = {
  setIndex?: number;
  solveIndex: number;
  scramble: string;
  event: RoomEvent;
  children: React.ReactNode;
};

export default function SolveDialog({
  setIndex,
  solveIndex,
  scramble,
  event,
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
          <scramble-display scramble={scramble} event={ROOM_EVENT_JS_NAME_MAP.get(event)}></scramble-display>
        </div>
        <div>{scramble}</div>
      </DialogContent>
    </Dialog>
  );
}
