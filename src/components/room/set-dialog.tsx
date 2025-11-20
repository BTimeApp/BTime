import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IResult, Result } from "@/types/result";
import React, { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard, zip } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRoomStore } from "@/context/room-context";
import { useSession } from "@/context/session-context";
import { IRoomSolve } from "@/types/room-solve";

// we expect scrambles and results to be of the same length. it should be one to one.
type SetDialogProps = {
  setIndex: number;
  children: React.ReactNode;
};

export default function SetDialog({ setIndex, children }: SetDialogProps) {
  const [roomName, users, teams, solves, raceSettings, teamSettings] =
    useRoomStore((s) => [
      s.roomName,
      s.users,
      s.teams,
      s.solves,
      s.raceSettings,
      s.teamSettings,
    ]);

  const { user: localUser } = useSession();
  const localTeam = useMemo(() => {
    return localUser ? teams[localUser?.userInfo.id] : undefined;
  }, [localUser, teams]);

  const setSolves: IRoomSolve[] = useMemo(() => {
    return solves.filter((roomSolve) => roomSolve.setIndex === setIndex);
  }, [solves, setIndex]);

  const relevantUsers: string[][] = useMemo(() => {
    return setSolves.map((roomSolve) => {
      if (!localUser) {
        return [];
      }
      if (teamSettings.teamsEnabled) {
        if (!localTeam) {
          return [];
        }
        return Object.entries(roomSolve.solve.attempts)
          .filter(([_uid, attempt]) => attempt.team === localTeam.team.id)
          .map(([uid, _]) => uid);
      } else {
        return [localUser.userInfo.id];
      }
    });
  }, [setSolves, localUser, localTeam, teamSettings]);

  //extract relevant scrambles, results
  const scrambles: Record<string, string>[] = useMemo(() => {
    return setSolves.map((roomSolve, idx) => {
      return Object.fromEntries(
        zip(
          relevantUsers[idx],
          relevantUsers[idx].map(
            (userId) => roomSolve.solve.attempts[userId].scramble
          )
        )
      );
    });
  }, [setSolves, relevantUsers]);

  const results: Record<string, IResult>[] = useMemo(() => {
    return setSolves.map((roomSolve, idx) => {
      return Object.fromEntries(
        zip(
          relevantUsers[idx],
          relevantUsers[idx].map((userId) => roomSolve.solve.results[userId])
        )
      );
    });
  }, [setSolves, relevantUsers]);

  const getUserTextRow = useCallback(
    (solveIdx: number, uid: string) => {
      return (
        users[uid].user.userName +
        ": " +
        (results[solveIdx][uid] &&
          Result.fromIResult(results[solveIdx][uid]).toString(true) + "\t") +
        scrambles[solveIdx][uid]
      );
    },
    [users, results, scrambles]
  );

  const resultTextCopy: string = useMemo(() => {
    return [
      `BTime Room: ${roomName}` +
        (teamSettings.teamsEnabled
          ? localTeam
            ? "Team: " + localTeam.team.name
            : ""
          : localUser
          ? "User: " + localUser.userInfo.userName
          : ""),
      `Set ${setIndex}`,
      ...setSolves.map((_roomSolve, idx) => [
        `${idx}.`,
        ...relevantUsers[idx].map((uid, _uidx) => getUserTextRow(idx, uid)),
      ]),
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
          {setSolves.map((_roomSolve, idx) => (
            <div key={idx}>
              <div>{idx}. </div>
              {relevantUsers[idx].map((uid, _uidx) => getUserTextRow(idx, uid))}
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
