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

// uses null to signify user not finished
// type ScrambleAttemptMapping = Record<string, Record<string, IResult | null>>;
type ScrambleAttemptMapping = Record<string, Record<string, IAttempt>>;

/**
 * Turns attempt information into a mapping of
 * <scramble: <user id, result>>.
 *
 * We take in attempts itself to allow pre-filtering out attempts.
 */
function getScrambleAttemptMapping(
  attempts: Record<string, IAttempt>
): ScrambleAttemptMapping {
  const mapping = {} as ScrambleAttemptMapping;

  for (const [uid, attempt] of Object.entries(attempts)) {
    if (!(attempt.scramble in mapping)) {
      mapping[attempt.scramble] = {} as Record<string, IAttempt>;
    }

    //guard against user not existing in the array, but should never happen
    mapping[attempt.scramble][uid] = attempt;
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
function ScrambleUserAttemptsListing({
  mapping,
  className,
}: {
  mapping: ScrambleAttemptMapping;
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
            {Object.entries(resultMapping).map(([uid, attempt], jdx) => (
              <div key={jdx} className="whitespace-pre-wrap">
                {users[uid]?.user.userName ?? "BTime User"}
                {"\t\t"}
                {attempt.finished
                  ? Result.fromIResult(attempt.result).toString(true)
                  : "---"}
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

  const localUser = useSession();
  const userScrambleAttemptMapping = useMemo(
    () =>
      localUser
        ? getScrambleAttemptMapping(
            filterRecord(
              solve.solve.attempts,
              (_attempt, uid) => uid === localUser.userInfo.id
            )
          )
        : ({} as ScrambleAttemptMapping),
    [localUser, solve]
  );

  const teamScrambleAttemptMappings: Record<string, ScrambleAttemptMapping> =
    useMemo(
      () =>
        filterRecord(
          mapRecordValues<string, IRoomTeam, ScrambleAttemptMapping>(
            teams,
            (roomTeam: IRoomTeam) =>
              getScrambleAttemptMapping(
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

  const allScrambleAttemptMapping = useMemo(
    () => getScrambleAttemptMapping(solve.solve.attempts),
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
            Object.keys(userScrambleAttemptMapping).length > 0 ? "user" : "all"
          }
        >
          <TabsList>
            {Object.keys(userScrambleAttemptMapping).length > 0 && (
              <TabsTrigger value="user">You</TabsTrigger>
            )}
            <TabsTrigger value="all">All</TabsTrigger>
            {teamSettings.teamsEnabled &&
              Object.keys(teamScrambleAttemptMappings).map((tid, idx) => (
                <TabsTrigger key={idx} value={tid}>
                  {teams[tid].team.name ?? "[No Name]"}
                </TabsTrigger>
              ))}
          </TabsList>
          {Object.keys(userScrambleAttemptMapping).length > 0 && (
            <TabsContent value="user">
              <ResultListingWrapper
                baseCopyText={baseCopyText}
                defaultValue={Object.keys(userScrambleAttemptMapping)[0]}
              >
                <ScrambleUserAttemptsListing
                  mapping={userScrambleAttemptMapping}
                />
              </ResultListingWrapper>
            </TabsContent>
          )}
          <TabsContent value="all">
            <ResultListingWrapper
              defaultValue={Object.keys(allScrambleAttemptMapping)[0]}
              baseCopyText={baseCopyText}
            >
              <ScrambleUserAttemptsListing
                mapping={allScrambleAttemptMapping}
              />
            </ResultListingWrapper>
          </TabsContent>
          {teamSettings.teamsEnabled &&
            Object.entries(teamScrambleAttemptMappings).map(
              ([tid, teamScrambleAttemptMapping], idx) => (
                <TabsContent key={idx} value={tid}>
                  <ResultListingWrapper
                    defaultValue={Object.keys(teamScrambleAttemptMapping)[0]}
                    baseCopyText={baseCopyText}
                    title={`Team Result:\t${
                      solve.solve.results[tid]
                        ? Result.fromIResult(solve.solve.results[tid]).toString(
                            true
                          )
                        : "TBD"
                    }`}
                  >
                    <ScrambleUserAttemptsListing
                      mapping={teamScrambleAttemptMapping}
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

  const localUser = useSession();
  const setSolves: IRoomSolve[] = useMemo(
    () =>
      match.sets.length >= setIndex ? match.sets[setIndex - 1].solves : [],
    [match, setIndex]
  );

  const userScrambleAttemptMappings: ScrambleAttemptMapping[] = useMemo(
    () =>
      setSolves.map((solve) =>
        localUser
          ? getScrambleAttemptMapping(
              filterRecord(
                solve.solve.attempts,
                (_attempt, uid) => uid === localUser.userInfo.id
              )
            )
          : ({} as ScrambleAttemptMapping)
      ),
    [localUser, setSolves]
  );

  const showUserTab = useMemo(
    () => userScrambleAttemptMappings.some((x) => Object.keys(x).length > 0),
    [userScrambleAttemptMappings]
  );

  const userDefaultScramble = useMemo(
    () =>
      Object.keys(
        userScrambleAttemptMappings.find((m) => Object.keys(m).length > 0) ?? {}
      )[0] ?? "",
    [userScrambleAttemptMappings]
  );

  const teamScrambleAttemptMappings: Record<string, ScrambleAttemptMapping[]> =
    useMemo(
      () =>
        filterRecord(
          mapRecordValues<string, IRoomTeam, ScrambleAttemptMapping[]>(
            teams,
            (roomTeam: IRoomTeam) => {
              return setSolves.map((solve) =>
                getScrambleAttemptMapping(
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
      mapRecordValues<string, ScrambleAttemptMapping[], string>(
        teamScrambleAttemptMappings,
        (setScrambleAttemptMapping) => {
          return (
            getFirstKey<string>(
              setScrambleAttemptMapping.find(
                (ScrambleAttemptMapping) =>
                  Object.keys(ScrambleAttemptMapping).length > 0
              ) ?? {}
            ) ?? ""
          );
        }
      ),
    [teamScrambleAttemptMappings]
  );

  const allScrambleAttemptMappings: ScrambleAttemptMapping[] = useMemo(
    () =>
      setSolves.map((solve) => getScrambleAttemptMapping(solve.solve.attempts)),
    [setSolves]
  );
  const allDefaultScramble = useMemo(
    () =>
      Object.keys(
        allScrambleAttemptMappings.find((m) => Object.keys(m).length > 0) ?? {}
      )[0] ?? "",
    [allScrambleAttemptMappings]
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
              Object.keys(teamScrambleAttemptMappings).map((tid, idx) => (
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
                {userScrambleAttemptMappings.map(
                  (userScrambleAttemptMapping, idx) => (
                    <div className="pl-4" key={idx}>
                      <p className="text-lg font-bold">Solve {idx + 1}</p>
                      <ScrambleUserAttemptsListing
                        mapping={userScrambleAttemptMapping}
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
              {allScrambleAttemptMappings.map(
                (allScrambleAttemptMapping, idx) => (
                  <div className="pl-4" key={idx}>
                    <p className="text-lg font-bold">Solve {idx + 1}</p>
                    <ScrambleUserAttemptsListing
                      mapping={allScrambleAttemptMapping}
                    />
                  </div>
                )
              )}
            </ResultListingWrapper>
          </TabsContent>
          {teamSettings.teamsEnabled &&
            Object.entries(teamScrambleAttemptMappings).map(
              ([tid, teamScrambleAttemptMappings], idx) => (
                <TabsContent key={idx} value={tid}>
                  <ResultListingWrapper
                    defaultValue={teamDefaultScrambles[tid] ?? ""}
                    baseCopyText={baseCopyText}
                  >
                    {/* TODO - show team result */}
                    {teamScrambleAttemptMappings.map(
                      (teamScrambleAttemptMapping, jdx) => (
                        <div className="pl-4" key={jdx}>
                          <p className="text-lg font-bold"> Solve {jdx + 1}</p>
                          <ScrambleUserAttemptsListing
                            mapping={teamScrambleAttemptMapping}
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

  const localUser = useSession();

  // Extract all sets. Creates a nested array of IRoomSolves, with inner array dimension grouped by set index.
  // This method should always be possible b/c solves is already sorted by setindex
  const sets: IRoomSet[] = useMemo(() => match.sets, [match]);

  const solves: IRoomSolve[] = useMemo(
    () => match.sets.flatMap((set) => set.solves),
    [match]
  );

  const userScrambleAttemptMappings: ScrambleAttemptMapping[][] = useMemo(
    () =>
      sets.map((set) =>
        set.solves.map((solve) =>
          localUser
            ? getScrambleAttemptMapping(
                filterRecord(
                  solve.solve.attempts,
                  (_attempt, uid) => uid === localUser.userInfo.id
                )
              )
            : ({} as ScrambleAttemptMapping)
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

  const teamScrambleAttemptMappings: Record<
    string,
    ScrambleAttemptMapping[][]
  > = useMemo(
    () =>
      filterRecord(
        mapRecordValues<string, IRoomTeam, ScrambleAttemptMapping[][]>(
          teams,
          (roomTeam: IRoomTeam) => {
            return sets.map((set) =>
              set.solves.map((solve) =>
                getScrambleAttemptMapping(
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
      mapRecordValues<string, ScrambleAttemptMapping[][], string>(
        teamScrambleAttemptMappings,
        (matchScrambleAttemptMapping) => {
          return getFirstKey<string>(
            matchScrambleAttemptMapping
              .find(
                (setScrambleAttemptMapping) =>
                  setScrambleAttemptMapping.length > 0
              )
              ?.find(
                (ScrambleAttemptMapping) =>
                  Object.keys(ScrambleAttemptMapping).length > 0
              ) ?? {}
          );
        }
      ),
    [teamScrambleAttemptMappings]
  );

  const allScrambleAttemptMappings: ScrambleAttemptMapping[][] = useMemo(
    () =>
      sets.map((set) =>
        set.solves.map((solve) =>
          getScrambleAttemptMapping(solve.solve.attempts)
        )
      ),
    [sets]
  );
  const allDefaultScramble = useMemo(
    () =>
      getFirstKey<string>(
        allScrambleAttemptMappings
          .find(
            (setScrambleAttemptMapping) => setScrambleAttemptMapping.length > 0
          )
          ?.find(
            (ScrambleAttemptMapping) =>
              Object.keys(ScrambleAttemptMapping).length > 0
          ) ?? {}
      ),
    [allScrambleAttemptMappings]
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
              Object.keys(teamScrambleAttemptMappings).map((tid, idx) => (
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
                {userScrambleAttemptMappings.map(
                  (userSetScrambleAttemptMapping, jdx) => (
                    <div className="pl-4" key={jdx}>
                      <p className="text-xl font-bold">Set {jdx + 1}</p>
                      {userSetScrambleAttemptMapping.map(
                        (userScrambleAttemptMapping, idx) => (
                          <div className="pl-4" key={idx}>
                            <p className="text-lg font-bold">Solve {idx + 1}</p>
                            <ScrambleUserAttemptsListing
                              mapping={userScrambleAttemptMapping}
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
              {allScrambleAttemptMappings.map(
                (allSetScrambleAttemptMapping, jdx) => (
                  <div className="pl-4" key={jdx}>
                    <p className="text-xl font-bold">Set {jdx + 1}</p>
                    {allSetScrambleAttemptMapping.map(
                      (allScrambleAttemptMapping, idx) => (
                        <div className="pl-4" key={idx}>
                          <p className="text-lg font-bold">Solve {idx + 1}</p>
                          <ScrambleUserAttemptsListing
                            mapping={allScrambleAttemptMapping}
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
            Object.entries(teamScrambleAttemptMappings).map(
              ([tid, teamScrambleAttemptMappings], idx) => (
                <TabsContent key={idx} value={tid}>
                  <ResultListingWrapper
                    defaultValue={teamDefaultScrambles[tid] ?? ""}
                    baseCopyText={baseCopyText}
                  >
                    {/* TODO - show team result */}
                    {teamScrambleAttemptMappings.map(
                      (teamSetScrambleAttemptMapping, jdx) => (
                        <div className="pl-4" key={jdx}>
                          <p className="text-xl font-bold">Set {jdx + 1}</p>
                          {teamSetScrambleAttemptMapping.map(
                            (teamScrambleAttemptMapping, jdx) => (
                              <div className="pl-4" key={jdx}>
                                <p className="text-lg font-bold">
                                  {" "}
                                  Solve {jdx + 1}
                                </p>
                                <ScrambleUserAttemptsListing
                                  mapping={teamScrambleAttemptMapping}
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
