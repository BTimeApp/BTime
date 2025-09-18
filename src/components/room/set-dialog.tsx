import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IResult, Result } from "@/types/result";
import React from "react";

// we expect scrmables and results to be of the same length. it should be one to one.
type SetDialogProps = {
  setIndex: number;
  scrambles: string[];
  results: IResult[];
  children: React.ReactNode;
};

export default function SetDialog({
  setIndex,
  scrambles,
  results,
  children,
}: SetDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogTitle>
          {setIndex && `Set ${setIndex}`}
        </DialogTitle>
        {scrambles.map((scramble, idx) => <div key={idx}>{idx + 1}.{"\t"}{Result.fromIResult(results[idx]).toString()}{"\t"}{scramble}</div>)}
      </DialogContent>
    </Dialog>
  );
}
