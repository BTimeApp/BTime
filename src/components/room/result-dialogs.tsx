import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IResult, Result } from "@/types/result";
import React, { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  copyTextToClipboard,
  createAttemptTextLine,
  downloadTextFile,
  zip,
} from "@/lib/utils";
import { useRoomStore } from "@/context/room-context";
import { IRoomSolve } from "@/types/room-solve";
import { useSession } from "@/context/session-context";
import { IAttempt } from "@/types/solve";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "../ui/scroll-area";

type SolveDialogProps = {
  solve: IRoomSolve;
  children: React.ReactNode;
};

// we expect scrambles and results to be of the same length. it should be one to one.
type SetDialogProps = {
  setIndex: number;
  children: React.ReactNode;
};

// we expect scrambles and results to be of the same length. it should be one to one.
type SummaryDialogProps = {
    roomName: string;
    scrambles: string[];
    results: IResult[];
    children: React.ReactNode;
  };

export function SolveDialog({ solve, children }: SolveDialogProps) {
  const [roomName, users, teams, raceSettings, teamSettings] = useRoomStore(
    (s) => [s.roomName, s.users, s.teams, s.raceSettings, s.teamSettings]
  );

  const { user: localUser } = useSession();

  // the local team at current time.
  const currentLocalTeam = useMemo(() => {
    return teamSettings.teamsEnabled &&
      localUser !== undefined &&
      users[localUser?.userInfo.id]?.currentTeam !== undefined
      ? teams[users[localUser.userInfo.id].currentTeam!]
      : undefined;
  }, [localUser, users, teams]);

  // the local team at solve time.
  const solveLocalTeam = useMemo(() => {
    return teamSettings.teamsEnabled &&
      localUser !== undefined &&
      solve.solve.attempts[localUser.userInfo.id]?.team !== undefined
      ? teams[solve.solve.attempts[localUser.userInfo.id].team!]
      : undefined;
  }, [localUser, users, teams, solve]);

  const localUserAttempt: IAttempt | undefined = useMemo(() => {
    return localUser ? solve.solve.attempts[localUser.userInfo.id] : undefined;
  }, [solve, localUser]);

  const currentLocalTeamResult = currentLocalTeam
    ? solve.solve.results[currentLocalTeam.team.id]
    : undefined;
  const currentLocalTeamAttempts: Record<string, IAttempt> = useMemo(() => {
    return currentLocalTeam
      ? Object.fromEntries(
          Object.entries(solve.solve.attempts).filter(
            ([_uid, attempt]) => attempt.team === currentLocalTeam.team.id
          )
        )
      : {};
  }, [solve, currentLocalTeam]);

  const solveLocalTeamResult = solveLocalTeam
    ? solve.solve.results[solveLocalTeam.team.id]
    : undefined;
  const solveLocalTeamAttempts: Record<string, IAttempt> = useMemo(() => {
    return solveLocalTeam
      ? Object.fromEntries(
          Object.entries(solve.solve.attempts).filter(
            ([_uid, attempt]) => attempt.team === solveLocalTeam.team.id
          )
        )
      : {};
  }, [solve, solveLocalTeam]);

  const defaultTab =
    teamSettings.teamsEnabled && solveLocalTeam ? "team" : "user";
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  const resultTextCopy: string = useMemo(() => {
    const resultTextArr = [
      `BTime Room ${roomName} ${
        raceSettings.roomFormat === "RACING" && `Set ${solve.setIndex} `
      } Solve ${solve.solveIndex}`,
    ];
    switch (activeTab) {
      case "user":
        if (localUser && localUserAttempt) {
          resultTextArr.push(createAttemptTextLine(localUserAttempt));
        }
        break;
      case "team":
        if (solveLocalTeam) {
          resultTextArr.push(
            `Team ${solveLocalTeam.team.name} result: ${
              solveLocalTeamResult
                ? Result.fromIResult(solveLocalTeamResult).toString(true)
                : "---"
            }`,
            ...Object.entries(solveLocalTeamAttempts).map(([uid, attempt]) =>
              createAttemptTextLine(attempt, users[uid]?.user.userName)
            ),
            `Members: ${Object.keys(solveLocalTeamAttempts)
              .map((uid) => users[uid]?.user.userName)
              .filter((username) => username !== undefined)
              .join(", ")}`
          );
        }
        break;
      case "currTeam":
        if (currentLocalTeam) {
          resultTextArr.push(
            `Team ${currentLocalTeam.team.name} result: ${
              currentLocalTeamResult
                ? Result.fromIResult(currentLocalTeamResult).toString(true)
                : "---"
            }`,
            ...Object.entries(currentLocalTeamAttempts).map(([uid, attempt]) =>
              createAttemptTextLine(attempt, users[uid]?.user.userName)
            ),
            `Members: ${Object.keys(currentLocalTeamAttempts)
              .map((uid) => users[uid]?.user.userName)
              .filter((username) => username !== undefined)
              .join(", ")}`
          );
        }
        break;
      case "all":
        resultTextArr.push(
          ...Object.entries(solve.solve.attempts).map(([uid, attempt]) =>
            createAttemptTextLine(attempt, users[uid]?.user.userName)
          )
        );
        break;
      default:
        return "";
    }

    return resultTextArr.join("\n");
  }, [activeTab, roomName, raceSettings, localUser, localUserAttempt, solveLocalTeam, solveLocalTeamAttempts, solveLocalTeamResult, currentLocalTeam, currentLocalTeamAttempts, currentLocalTeamResult, ]);

  if (!localUser) {
    return children;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="py-3">
        <DialogHeader>
          <DialogTitle>
            {solve.setIndex && `Set ${solve.setIndex}`}{" "}
            {`Solve ${solve.solveIndex}`}
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={defaultTab} onValueChange={setActiveTab}>
          <TabsList>
            {localUserAttempt && <TabsTrigger value="user">You</TabsTrigger>}
            {solveLocalTeam && (
              <TabsTrigger value="team">{solveLocalTeam.team.name}</TabsTrigger>
            )}
            {currentLocalTeam && currentLocalTeam != solveLocalTeam && (
              <TabsTrigger value="currTeam">
                {currentLocalTeam.team.name}
              </TabsTrigger>
            )}
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          {localUserAttempt && (
            <TabsContent value="user">
              <div>
                {createAttemptTextLine(
                  localUserAttempt,
                  users[localUser.userInfo.id]?.user.userName
                )}
              </div>
            </TabsContent>
          )}
          {teamSettings.teamsEnabled && solveLocalTeam && (
            <TabsContent value="team">
              <div>
                Team Result:{" "}
                {solveLocalTeamResult
                  ? Result.fromIResult(solveLocalTeamResult).toString(true)
                  : "TBD"}
              </div>
              {Object.entries(solveLocalTeamAttempts).map(
                ([uid, attempt], idx) => (
                  <div key={idx}>
                    {createAttemptTextLine(attempt, users[uid]?.user.userName)}
                  </div>
                )
              )}
            </TabsContent>
          )}
          {teamSettings.teamsEnabled && currentLocalTeam && (
            <TabsContent value="currTeam">
              <div>
                Team Result:{" "}
                {Result.fromIResult(currentLocalTeamResult).toString(true)}
              </div>
              {Object.entries(currentLocalTeamAttempts).map(
                ([uid, attempt], idx) => (
                  <div key={idx}>
                    {createAttemptTextLine(attempt, users[uid]?.user.userName)}
                  </div>
                )
              )}
            </TabsContent>
          )}
          <TabsContent value="all">
            {Object.entries(solve.solve.attempts).map(([uid, attempt], idx) => (
              <div key={idx}>
                {createAttemptTextLine(attempt, users[uid]?.user.userName)}
              </div>
            ))}
          </TabsContent>
        </Tabs>

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

export function SetDialog({ setIndex, children }: SetDialogProps) {
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

export function SummaryDialog({
  roomName,
  scrambles,
  results,
  children,
}: SummaryDialogProps) {
  const resultTextCopy: string = useMemo(() => {
    // return (
    //   "BTime Room Summary\nRoom Name: " +
    //   roomName +
    //   "\n" +
    //   createResultTextLines(scrambles, results)
    // );
    return "";
  }, [roomName, scrambles, results]);

  const resultTextDownload: string = useMemo(() => {
    // return (
    //   "Solve\tResult\tScramble\n" + createResultTextLines(scrambles, results)
    // );
    return "";
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
