import {
  Dialog,
  DialogContent,
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
  getFirstKey,
  mapRecordValues,
  //   downloadTextFile,
} from "@/lib/utils";
import { useRoomStore } from "@/context/room-context";
import { IRoomSet, IRoomSolve } from "@/types/room-solve";
import { useSession } from "@/context/session-context";
import { IAttempt } from "@/types/solve";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomRadioItem, RadioGroup } from "@/components/ui/radio-group";
import { ROOM_EVENTS_INFO } from "@/types/room";
import { IRoomTeam } from "@/types/room-participant";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

type SolveDialogProps = {
  solve: IRoomSolve;
  setIndex: number; //1 indexed (when looking at the sets array)
  children: React.ReactNode;
};

// we expect scrambles and results to be of the same length. it should be one to one.
type SetDialogProps = {
  setIndex: number; //1 indexed (when looking at the sets array)
  children: React.ReactNode;
};

// we expect scrambles and results to be of the same length. it should be one to one.
type SummaryDialogProps = {
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
        <div key={idx} className="pr-4">
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
        </div>
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
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={65} className="px-2">
          <div ref={textContainerRef}>
            {title && <div className="text-lg font-bold">{title}</div>}
            <div className="max-h-[50vh] overflow-y-auto">
              <RadioGroup
                defaultValue={defaultValue}
                onValueChange={setScramble}
              >
                {children}
              </RadioGroup>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={35} className="px-2">
          <div className="mx-5 px-4 border-2 rounded-lg h-fit">
            <twisty-player
              experimental-setup-alg={scramble}
              puzzle={ROOM_EVENTS_INFO[roomEvent]?.jsName ?? "3x3x3"}
              visualization="2D"
              control-panel="none"
              background="none"
              className="w-full"
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      {/* <div className="flex flex-row gap-2">
        
      </div> */}
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

export function SolveDialog({ solve, setIndex, children }: SolveDialogProps) {
  const [roomName, teams, raceSettings, teamSettings] = useRoomStore((s) => [
    s.roomName,
    s.teams,
    s.raceSettings,
    s.teamSettings,
  ]);

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
    `${raceSettings.roomFormat === "RACING" && `Set ${setIndex} `} Solve ${
      solve.index
    }`,
  ].join("\n");

  if (!localUser) {
    return children;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="py-3 md:min-w-[50vw]">
        <DialogHeader>
          <DialogTitle>
            {raceSettings.roomFormat !== "CASUAL" && `Set ${setIndex}`}{" "}
            {`Solve ${solve.index}`}
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
            Object.entries(teamScrambleResultMappings).map(
              ([tid, teamScrambleResultMapping], idx) => (
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
              )
            )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function SetDialog({ setIndex, children }: SetDialogProps) {
  const [roomName, teams, match, teamSettings] = useRoomStore((s) => [
    s.roomName,
    s.teams,
    s.match,
    s.teamSettings,
  ]);

  const { user: localUser } = useSession();
  const setSolves: IRoomSolve[] = useMemo(
    () =>
      match.sets.length >= setIndex ? match.sets[setIndex - 1].solves : [],
    [match, setIndex]
  );

  const userScrambleResultMappings: ScrambleResultMapping[] = useMemo(
    () =>
      setSolves.map((solve) =>
        localUser
          ? getScrambleResultMapping(
              filterRecord(
                solve.solve.attempts,
                (_attempt, uid) => uid === localUser.userInfo.id
              )
            )
          : ({} as ScrambleResultMapping)
      ),
    [localUser, setSolves]
  );

  const showUserTab = useMemo(
    () => userScrambleResultMappings.some((x) => Object.keys(x).length > 0),
    [userScrambleResultMappings]
  );

  const userDefaultScramble = useMemo(
    () =>
      Object.keys(
        userScrambleResultMappings.find((m) => Object.keys(m).length > 0) ?? {}
      )[0] ?? "",
    [userScrambleResultMappings]
  );

  const teamScrambleResultMappings: Record<string, ScrambleResultMapping[]> =
    useMemo(
      () =>
        filterRecord(
          mapRecordValues<string, IRoomTeam, ScrambleResultMapping[]>(
            teams,
            (roomTeam: IRoomTeam) => {
              return setSolves.map((solve) =>
                getScrambleResultMapping(
                  filterRecord(
                    solve.solve.attempts,
                    (attempt) => attempt.team === roomTeam.team.id
                  )
                )
              );
            }
          ),
          (resultMappings) =>
            resultMappings.some(
              (resultMapping) => Object.keys(resultMapping).length > 0
            )
        ),
      [teams, setSolves]
    );

  const teamDefaultScrambles = useMemo(
    () =>
      mapRecordValues<string, ScrambleResultMapping[], string>(
        teamScrambleResultMappings,
        (setScrambleResultMapping) => {
          return (
            getFirstKey<string>(
              setScrambleResultMapping.find(
                (scrambleResultMapping) =>
                  Object.keys(scrambleResultMapping).length > 0
              ) ?? {}
            ) ?? ""
          );
        }
      ),
    [teamScrambleResultMappings]
  );

  const allScrambleResultMappings: ScrambleResultMapping[] = useMemo(
    () =>
      setSolves.map((solve) => getScrambleResultMapping(solve.solve.attempts)),
    [setSolves]
  );
  const allDefaultScramble = useMemo(
    () =>
      Object.keys(
        allScrambleResultMappings.find((m) => Object.keys(m).length > 0) ?? {}
      )[0] ?? "",
    [allScrambleResultMappings]
  );

  const baseCopyText = [
    `BTime Room ${roomName}`,
    `Set ${setIndex} Summary`,
  ].join("\n");

  if (!localUser) {
    return children;
  }
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="py-3 md:min-w-[65vw]">
        <DialogHeader>
          <DialogTitle>{`Set ${setIndex} Summary`}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={showUserTab ? "user" : "all"}>
          <TabsList>
            {showUserTab && <TabsTrigger value="user">You</TabsTrigger>}
            <TabsTrigger value="all">All</TabsTrigger>
            {teamSettings.teamsEnabled &&
              Object.keys(teamScrambleResultMappings).map((tid, idx) => (
                <TabsTrigger key={idx} value={tid}>
                  {teams[tid].team.name ?? "[No Name]"}
                </TabsTrigger>
              ))}
          </TabsList>
          {showUserTab && (
            <TabsContent value="user">
              <ResultListingWrapper
                baseCopyText={baseCopyText}
                defaultValue={userDefaultScramble}
              >
                {userScrambleResultMappings.map(
                  (userScrambleResultMapping, idx) => (
                    <div className="pl-4" key={idx}>
                      <p className="text-lg font-bold">Solve {idx + 1}</p>
                      <ScrambleUserResultsListing
                        mapping={userScrambleResultMapping}
                      />
                    </div>
                  )
                )}
              </ResultListingWrapper>
            </TabsContent>
          )}
          <TabsContent value="all">
            <ResultListingWrapper
              defaultValue={allDefaultScramble}
              baseCopyText={baseCopyText}
            >
              {allScrambleResultMappings.map(
                (allScrambleResultMapping, idx) => (
                  <div className="pl-4" key={idx}>
                    <p className="text-lg font-bold">Solve {idx + 1}</p>
                    <ScrambleUserResultsListing
                      mapping={allScrambleResultMapping}
                    />
                  </div>
                )
              )}
            </ResultListingWrapper>
          </TabsContent>
          {teamSettings.teamsEnabled &&
            Object.entries(teamScrambleResultMappings).map(
              ([tid, teamScrambleResultMappings], idx) => (
                <TabsContent key={idx} value={tid}>
                  <ResultListingWrapper
                    defaultValue={teamDefaultScrambles[tid] ?? ""}
                    baseCopyText={baseCopyText}
                  >
                    {/* TODO - show team result */}
                    {teamScrambleResultMappings.map(
                      (teamScrambleResultMapping, jdx) => (
                        <div className="pl-4" key={jdx}>
                          <p className="text-lg font-bold"> Solve {jdx + 1}</p>
                          <ScrambleUserResultsListing
                            mapping={teamScrambleResultMapping}
                          />
                        </div>
                      )
                    )}
                  </ResultListingWrapper>
                </TabsContent>
              )
            )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function SummaryDialog({ children }: SummaryDialogProps) {
  const [roomName, teams, match, teamSettings] = useRoomStore((s) => [
    s.roomName,
    s.teams,
    s.match,
    s.teamSettings,
  ]);

  const { user: localUser } = useSession();

  // Extract all sets. Creates a nested array of IRoomSolves, with inner array dimension grouped by set index.
  // This method should always be possible b/c solves is already sorted by setindex
  const sets: IRoomSet[] = useMemo(() => match.sets, [match]);

  const solves: IRoomSolve[] = useMemo(
    () => match.sets.flatMap((set) => set.solves),
    [match]
  );

  const userScrambleResultMappings: ScrambleResultMapping[][] = useMemo(
    () =>
      sets.map((set) =>
        set.solves.map((solve) =>
          localUser
            ? getScrambleResultMapping(
                filterRecord(
                  solve.solve.attempts,
                  (_attempt, uid) => uid === localUser.userInfo.id
                )
              )
            : ({} as ScrambleResultMapping)
        )
      ),
    [localUser, sets]
  );

  const userDefaultScramble = useMemo(
    () =>
      localUser
        ? solves.find(
            (solve) => solve.solve.attempts[localUser.userInfo.id] !== undefined
          )?.solve.attempts[localUser.userInfo.id].scramble ?? ""
        : "",
    [localUser, solves]
  );

  const showUserTab = useMemo(
    () => userDefaultScramble != "",
    [userDefaultScramble]
  );

  const teamScrambleResultMappings: Record<string, ScrambleResultMapping[][]> =
    useMemo(
      () =>
        filterRecord(
          mapRecordValues<string, IRoomTeam, ScrambleResultMapping[][]>(
            teams,
            (roomTeam: IRoomTeam) => {
              return sets.map((set) =>
                set.solves.map((solve) =>
                  getScrambleResultMapping(
                    filterRecord(
                      solve.solve.attempts,
                      (attempt) => attempt.team === roomTeam.team.id
                    )
                  )
                )
              );
            }
          ),
          (setResultMappings) =>
            setResultMappings.some((setResultMapping) =>
              setResultMapping.some(
                (resultMapping) => Object.keys(resultMapping).length > 0
              )
            )
        ),
      [teams, sets]
    );

  const teamDefaultScrambles = useMemo(
    () =>
      mapRecordValues<string, ScrambleResultMapping[][], string>(
        teamScrambleResultMappings,
        (matchScrambleResultMapping) => {
          return getFirstKey<string>(
            matchScrambleResultMapping
              .find(
                (setScrambleResultMapping) =>
                  setScrambleResultMapping.length > 0
              )
              ?.find(
                (scrambleResultMapping) =>
                  Object.keys(scrambleResultMapping).length > 0
              ) ?? {}
          );
        }
      ),
    [teamScrambleResultMappings]
  );

  const allScrambleResultMappings: ScrambleResultMapping[][] = useMemo(
    () =>
      sets.map((set) =>
        set.solves.map((solve) =>
          getScrambleResultMapping(solve.solve.attempts)
        )
      ),
    [sets]
  );
  const allDefaultScramble = useMemo(
    () =>
      getFirstKey<string>(
        allScrambleResultMappings
          .find(
            (setScrambleResultMapping) => setScrambleResultMapping.length > 0
          )
          ?.find(
            (scrambleResultMapping) =>
              Object.keys(scrambleResultMapping).length > 0
          ) ?? {}
      ),
    [allScrambleResultMappings]
  );

  const baseCopyText = `BTime Room ${roomName} Summary`;
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="py-3 md:min-w-[65vw]">
        <DialogHeader>
          <DialogTitle>BTime Room {roomName} Summary</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={showUserTab ? "user" : "all"}>
          <TabsList>
            {showUserTab && <TabsTrigger value="user">You</TabsTrigger>}
            <TabsTrigger value="all">All</TabsTrigger>
            {teamSettings.teamsEnabled &&
              Object.keys(teamScrambleResultMappings).map((tid, idx) => (
                <TabsTrigger key={idx} value={tid}>
                  {teams[tid].team.name ?? "[No Name]"}
                </TabsTrigger>
              ))}
          </TabsList>
          {showUserTab && (
            <TabsContent value="user">
              <ResultListingWrapper
                baseCopyText={baseCopyText}
                defaultValue={userDefaultScramble}
              >
                {userScrambleResultMappings.map(
                  (userSetScrambleResultMapping, jdx) => (
                    <div className="pl-4" key={jdx}>
                      <p className="text-xl font-bold">Set {jdx + 1}</p>
                      {userSetScrambleResultMapping.map(
                        (userScrambleResultMapping, idx) => (
                          <div className="pl-4" key={idx}>
                            <p className="text-lg font-bold">Solve {idx + 1}</p>
                            <ScrambleUserResultsListing
                              mapping={userScrambleResultMapping}
                            />
                          </div>
                        )
                      )}
                    </div>
                  )
                )}
              </ResultListingWrapper>
            </TabsContent>
          )}
          <TabsContent value="all">
            <ResultListingWrapper
              defaultValue={allDefaultScramble}
              baseCopyText={baseCopyText}
            >
              {allScrambleResultMappings.map(
                (allSetScrambleResultMapping, jdx) => (
                  <div className="pl-4" key={jdx}>
                    <p className="text-xl font-bold">Set {jdx + 1}</p>
                    {allSetScrambleResultMapping.map(
                      (allScrambleResultMapping, idx) => (
                        <div className="pl-4" key={idx}>
                          <p className="text-lg font-bold">Solve {idx + 1}</p>
                          <ScrambleUserResultsListing
                            mapping={allScrambleResultMapping}
                          />
                        </div>
                      )
                    )}
                  </div>
                )
              )}
            </ResultListingWrapper>
          </TabsContent>
          {teamSettings.teamsEnabled &&
            Object.entries(teamScrambleResultMappings).map(
              ([tid, teamScrambleResultMappings], idx) => (
                <TabsContent key={idx} value={tid}>
                  <ResultListingWrapper
                    defaultValue={teamDefaultScrambles[tid] ?? ""}
                    baseCopyText={baseCopyText}
                  >
                    {/* TODO - show team result */}
                    {teamScrambleResultMappings.map(
                      (teamSetScrambleResultMapping, jdx) => (
                        <div className="pl-4" key={jdx}>
                          <p className="text-xl font-bold">Set {jdx + 1}</p>
                          {teamSetScrambleResultMapping.map(
                            (teamScrambleResultMapping, jdx) => (
                              <div className="pl-4" key={jdx}>
                                <p className="text-lg font-bold">
                                  {" "}
                                  Solve {jdx + 1}
                                </p>
                                <ScrambleUserResultsListing
                                  mapping={teamScrambleResultMapping}
                                />
                              </div>
                            )
                          )}
                        </div>
                      )
                    )}
                  </ResultListingWrapper>
                </TabsContent>
              )
            )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
