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
        {/* TODO change this once a version of cubing-js or scramble-display with react support comes out */}
        <div
          dangerouslySetInnerHTML={{
            __html: `<scramble-display scramble="${scramble}" event="${ROOM_EVENT_JS_NAME_MAP.get(
              event
            )}"></scramble-display>`,
          }}
        />
        <div>{scramble}</div>
      </DialogContent>
    </Dialog>
  );
}
