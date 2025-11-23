import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DNF_IRESULT, IResult, Result } from "@/types/result";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  cn,
  copyTextToClipboard,
  filterRecord,
  mapRecordValues,
  //   downloadTextFile,
} from "@/lib/utils";
import { useRoomStore } from "@/context/room-context";
import { IRoomSolve } from "@/types/room-solve";
import { useSession } from "@/context/session-context";
import { IAttempt } from "@/types/solve";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomRadioItem, RadioGroup } from "@/components/ui/radio-group";
import { ROOM_EVENTS_INFO } from "@/types/room";
import { IRoomTeam } from "@/types/room-participant";

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

type ScrambleResultMapping = Record<string, Record<string, IResult>>;

/**
 * Turns attempt information into a mapping of
 * <scramble: <user id, result>>.
 *
 * We take in attempts itself to allow pre-filtering out attempts.
 */
function getScrambleResultMapping(
  attempts: Record<string, IAttempt>
): ScrambleResultMapping {
  const mapping = {} as ScrambleResultMapping;

  for (const [uid, attempt] of Object.entries(attempts)) {
    if (!(attempt.scramble in mapping)) {
      mapping[attempt.scramble] = {} as Record<string, IResult>;
    }

    //guard against user not existing in the array, but should never happen
    mapping[attempt.scramble][uid] = attempt.finished
      ? attempt.result
      : DNF_IRESULT;
  }

  return mapping;
}

/**
 * If using radio group item, make sure to wrap this with radio group manually
 * Safe so far b/c only used within this file.
 *
 * Given a mapping, lists the scrambles and corresponding results as follows:
 *
 * [scramble]
 *   [user] [result]
 *   [user] [result]
 *
 * [scramble]
 *   ...
 */
function ScrambleUserResultsListing({
  mapping,
  className,
}: {
  mapping: ScrambleResultMapping;
  className?: string;
}) {
  const [users] = useRoomStore((s) => [s.users]);
  return (
    <div className={cn("", className)}>
      {Object.entries(mapping).map(([scramble, resultMapping], idx) => (
        <React.Fragment key={idx}>
          <CustomRadioItem value={scramble} className="text-left p-1">
            <p>{scramble}</p>
          </CustomRadioItem>

          <div className="pl-4">
            {Object.entries(resultMapping).map(([uid, iResult], jdx) => (
              <div key={jdx} className="whitespace-pre-wrap">
                {users[uid]?.user.userName ?? "BTime User"}
                {"\t\t"}
                {Result.fromIResult(iResult).toString(true)}
              </div>
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Wraps result listing and
 * If using radio group items, this component should go around them.
 */
function ResultListingWrapper({
  title,
  baseCopyText = "",
  defaultValue,
  children,
}: {
  title?: string;
  baseCopyText: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  const textContainerRef = useRef<HTMLDivElement>(null);
  const [scramble, setScramble] = useState<string>(defaultValue ?? "");

  const [roomEvent] = useRoomStore((s) => [s.roomEvent]);

  const copyText = useCallback(() => {
    const copyText = [];

    if (baseCopyText) {
      copyText.push(baseCopyText);
    }
    if (textContainerRef.current?.innerText) {
      copyText.push(textContainerRef.current?.innerText);
    }

    return copyText.join("\n");
  }, [baseCopyText]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row gap-2">
        <div ref={textContainerRef}>
          {title && <div className="text-lg font-bold">{title}</div>}
          <div className="max-h-[50vh] overflow-y-auto">
            <RadioGroup defaultValue={defaultValue} onValueChange={setScramble}>
              {children}
            </RadioGroup>
          </div>
        </div>
        <twisty-player
          experimental-setup-alg={scramble}
          puzzle={ROOM_EVENTS_INFO[roomEvent]?.jsName ?? "3x3x3"}
          visualization="2D"
          control-panel="none"
          background="none"
          className="border-2 rounded-lg h-40 w-50 flex-none"
        />
      </div>
      <div className="flex flex-row">
        <Button
          variant="primary"
          className="ml-auto"
          onClick={() => copyTextToClipboard(copyText())}
        >
          Copy
        </Button>
      </div>
    </div>
  );
}

export function SolveDialog({ solve, children }: SolveDialogProps) {
  const [roomName, teams, raceSettings, teamSettings] = useRoomStore(
    (s) => [s.roomName, s.teams, s.raceSettings, s.teamSettings]
  );

  const { user: localUser } = useSession();
  const userScrambleResultMapping = useMemo(
    () =>
      localUser
        ? getScrambleResultMapping(
            filterRecord(
              solve.solve.attempts,
              (_attempt, uid) => uid === localUser.userInfo.id
            )
          )
        : ({} as ScrambleResultMapping),
    [localUser, solve]
  );

  const teamScrambleResultMappings: Record<string, ScrambleResultMapping> =
    useMemo(
      () =>
        filterRecord(
          mapRecordValues<string, IRoomTeam, ScrambleResultMapping>(
            teams,
            (roomTeam: IRoomTeam) =>
              getScrambleResultMapping(
                filterRecord(
                  solve.solve.attempts,
                  (attempt) => attempt.team === roomTeam.team.id
                )
              )
          ),
          (resultMapping) => Object.keys(resultMapping).length > 0
        ),
      [teams, solve]
    );

  const allScrambleResultMapping = useMemo(
    () => getScrambleResultMapping(solve.solve.attempts),
    [solve]
  );
  const baseCopyText = [
    `BTime Room ${roomName}`,
    `${
      raceSettings.roomFormat === "RACING" && `Set ${solve.setIndex} `
    } Solve ${solve.solveIndex}`,
  ].join("\n");

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
        <Tabs
          defaultValue={
            Object.keys(userScrambleResultMapping).length > 0 ? "user" : "all"
          }
        >
          <TabsList>
            {Object.keys(userScrambleResultMapping).length > 0 && (
              <TabsTrigger value="user">You</TabsTrigger>
            )}
            <TabsTrigger value="all">All</TabsTrigger>
            {teamSettings.teamsEnabled &&
              Object.keys(teamScrambleResultMappings).map((tid, idx) => (
                <TabsTrigger key={idx} value={tid}>
                  {teams[tid].team.name ?? "[No Name]"}
                </TabsTrigger>
              ))}
          </TabsList>
          {Object.keys(userScrambleResultMapping).length > 0 && (
            <TabsContent value="user">
              <ResultListingWrapper
                baseCopyText={baseCopyText}
                defaultValue={Object.keys(userScrambleResultMapping)[0]}
              >
                <ScrambleUserResultsListing
                  mapping={userScrambleResultMapping}
                />
              </ResultListingWrapper>
            </TabsContent>
          )}
          <TabsContent value="all">
            <ResultListingWrapper
              defaultValue={Object.keys(allScrambleResultMapping)[0]}
              baseCopyText={baseCopyText}
            >
              <ScrambleUserResultsListing mapping={allScrambleResultMapping} />
            </ResultListingWrapper>
          </TabsContent>
          {teamSettings.teamsEnabled &&
            Object.entries(teamScrambleResultMappings).map(([tid, teamScrambleResultMapping], idx) => (
              <TabsContent key={idx} value={tid}>
                <ResultListingWrapper
                  defaultValue={Object.keys(teamScrambleResultMapping)[0]}
                  baseCopyText={baseCopyText}
                  title={`Team Result:\t${
                    solve.solve.results[tid]
                      ? Result.fromIResult(solve.solve.results[tid]).toString(
                          true
                        )
                      : "TBD"
                  }`}
                >
                  <ScrambleUserResultsListing
                    mapping={teamScrambleResultMapping}
                  />
                </ResultListingWrapper>
              </TabsContent>
            ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function SetDialog({ setIndex, children }: SetDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="py-3">
        <DialogHeader>
          <DialogTitle>{setIndex && `Set ${setIndex}`}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh]">
          Set Summary has been temporarily disabled.
        </ScrollArea>
        <DialogFooter className="flex flex-row gap-2">
          {/* <Button
            variant="primary"
            onClick={() => {
              copyTextToClipboard(resultTextCopy);
            }}
          >
            Copy to Clipboard
          </Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SummaryDialog({
  roomName,
  //   scrambles,
  //   results,
  children,
}: SummaryDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="py-3">
        <DialogHeader>
          <DialogTitle>Room Summary: {roomName}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh]">
          Room Summary has been temporarily disabled.
        </ScrollArea>
        <DialogFooter className="flex flex-row gap-2">
          {/* <Button
            variant="primary"
            onClick={() => {
              copyTextToClipboard(resultTextCopy);
            }}
          >
            Copy to Clipboard
          </Button> */}
          {/* <Button
            variant="primary"
            onClick={() => {
              downloadTextFile(`BTime_${roomName}.txt`, resultTextDownload);
            }}
          >
            Download Solves
          </Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
