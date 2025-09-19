import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IResult, Result } from "@/types/result";
import { ROOM_EVENT_JS_NAME_MAP, RoomEvent } from "@/types/room";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard, createResultTextLine } from "@/lib/utils";

type SolveDialogProps = {
  roomName: string;
  setIndex?: number;
  solveIndex: number;
  scramble: string;
  event: RoomEvent;
  result?: IResult;
  children: React.ReactNode;
};

export default function SolveDialog({
  roomName,
  setIndex,
  solveIndex,
  scramble,
  event,
  result,
  children,
}: SolveDialogProps) {
  const [resultTextCopy, setResultTextCopy] = useState<string>("");
  useEffect(() => {
    setResultTextCopy(
      [
        `BTime Room: ${roomName}`,
        `${setIndex != null ? "Set " + setIndex + " " : ""}Solve ${solveIndex}`,
        createResultTextLine(scramble, result),
      ].join("\n")
    );
  }, [roomName, scramble, result, setIndex, solveIndex]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="py-3">
        <DialogHeader>
          <DialogTitle>
            {setIndex && `Set ${setIndex}`} {`Solve ${solveIndex}`}
          </DialogTitle>
        </DialogHeader>
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
        <div>
          {result && Result.fromIResult(result).toString(true) + "\t"}
          {scramble}
        </div>
        <DialogFooter className="flex flex-row gap-2">
          <Button
            variant="primary"
            onClick={() => {
              copyTextToClipboard(resultTextCopy);
            }}
          >
            Copy to Clipboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
