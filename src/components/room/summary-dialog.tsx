"use client";
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
import {
  copyTextToClipboard,
  createResultTextLines,
  downloadTextFile,
} from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// we expect scrmables and results to be of the same length. it should be one to one.
type SummaryDialogProps = {
  roomName: string;
  scrambles: string[];
  results: IResult[];
  children: React.ReactNode;
};

export default function SummaryDialog({
  roomName,
  scrambles,
  results,
  children,
}: SummaryDialogProps) {
  const resultTextCopy: string = useMemo(() => {
    return (
      "BTime Room Summary\nRoom Name: " +
      roomName +
      "\n" +
      createResultTextLines(scrambles, results)
    );
  }, [roomName, scrambles, results]);

  const resultTextDownload: string = useMemo(() => {
    return (
      "Solve\tResult\tScramble\n" + createResultTextLines(scrambles, results)
    );
  }, [scrambles, results]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="py-3">
        <DialogHeader>
          <DialogTitle>Room Summary: {roomName}</DialogTitle>
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
          <Button
            variant="primary"
            onClick={() => {
              downloadTextFile(`BTime_${roomName}.txt`, resultTextDownload);
            }}
          >
            Download Solves
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
