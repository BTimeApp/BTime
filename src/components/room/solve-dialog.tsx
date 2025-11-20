import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Result } from "@/types/result";
import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard, createAttemptTextLine } from "@/lib/utils";
import { useRoomStore } from "@/context/room-context";
import { IRoomSolve } from "@/types/room-solve";
import { useSession } from "@/context/session-context";
import { IAttempt } from "@/types/solve";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SolveDialogProps = {
  solve: IRoomSolve;
  children: React.ReactNode;
};

export default function SolveDialog({ solve, children }: SolveDialogProps) {
  const [roomName, users, teams, raceSettings, teamSettings] =
    useRoomStore((s) => [
      s.roomName,
      s.users,
      s.teams,
      s.raceSettings,
      s.teamSettings,
    ]);

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
          resultTextArr.push(
            createAttemptTextLine(localUserAttempt)
          );
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
  }, [activeTab, roomName]);

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
