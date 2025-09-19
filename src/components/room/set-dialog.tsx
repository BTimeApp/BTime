import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IResult, Result } from "@/types/result";
import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard, createResultTextLines } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
// we expect scrmables and results to be of the same length. it should be one to one.
type SetDialogProps = {
  roomName: string;
  setIndex: number;
  scrambles: string[];
  results: IResult[];
  children: React.ReactNode;
};

export default function SetDialog({
  roomName,
  setIndex,
  scrambles,
  results,
  children,
}: SetDialogProps) {
  const resultTextCopy: string = useMemo(() => {
    return [
      "BTime Room Set Summary",
      `Room Name: ${roomName}`,
      `Set ${setIndex}`,
      createResultTextLines(scrambles, results),
    ].join("\n");
  }, [roomName, scrambles, results, setIndex]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="py-3">
        <DialogHeader>
        <DialogTitle>{setIndex && `Set ${setIndex}`}</DialogTitle>  
        </DialogHeader>
        <ScrollArea className="max-h-[50vh]">
          {scrambles.map((scramble, idx) => (
            <div key={idx}>
              {idx + 1}.{"\t"}
              {Result.fromIResult(results[idx]).toString()}
              {"\t"}
              {scramble}
            </div>
          ))}
        </ScrollArea>
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
