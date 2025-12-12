import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Crown } from "lucide-react";
import { IRoomTeam, IRoomUser } from "@/types/room-participant";
import { IRoomSolve } from "@/types/room-solve";
import { DNF, Result } from "@/types/result";
import { cn } from "@/lib/utils";
import {
  SummaryDialog,
  SetDialog,
  SolveDialog,
} from "@/components/room/result-dialogs";
import { useRoomStore } from "@/context/room-context";
import { useMemo, Fragment } from "react";

type SetSummary = {
  setSummary?: IRoomSolve;
  solveSummaries: IRoomSolve[];
};

export default function GlobalTimeList({ className }: { className: string }) {
  const users = useRoomStore((s) => s.users);
  const teams = useRoomStore((s) => s.teams);
  const match = useRoomStore((s) => s.match);
  const raceSettings = useRoomStore((s) => s.raceSettings);
  const teamSettings = useRoomStore((s) => s.teamSettings);

  const participants = useMemo(() => {
    return teamSettings.teamsEnabled ? teams : users;
  }, [teamSettings, teams, users]);

  /**
   * Potential strategy for incorporating "summary" rows
   *
   * Create a list rows[][].
   * Both Solves and Summaries can be represented by IRoomSolve abstraction
   * Each new list in rows represents a new set.
   */
  const rows: SetSummary[] = useMemo(() => {
    const rows = [];
    for (let i = 0; i < match.sets.length; i++) {
      const set = match.sets[i];

      const setSolves = set.solves;

      const setSummaryRow: SetSummary = {
        solveSummaries: setSolves,
      };

      //push a set summary after every set
      if (raceSettings.roomFormat !== "CASUAL") {
        const setSummary: IRoomSolve = {
          solve: {
            id: -1,
            scrambles: [],
            attempts: {},
            results: {},
          },
          index: i + 1,
          finished: set.finished,
          winners: set.winners,
        };

        if (set.finished) {
          for (const pid of Object.keys(participants)) {
            //user's results for the given set
            const participantSetResults = setSolves.map((solve) =>
              Object.hasOwn(solve.solve.results, pid)
                ? solve.solve.results[pid]
                : new Result(0, "DNF").toIResult()
            );

            //calculate summary metric
            let userPoints = DNF;
            switch (raceSettings.setFormat) {
              case "BEST_OF":
                userPoints = setSolves.filter((solve) =>
                  solve.winners?.includes(pid)
                ).length;
                break;
              case "FIRST_TO":
                userPoints = setSolves.filter((solve) =>
                  solve.winners?.includes(pid)
                ).length;
                break;
              case "AVERAGE_OF":
                userPoints = Result.iAverageOf(participantSetResults);
                break;
              case "MEAN_OF":
                userPoints = Result.iMeanOf(participantSetResults);
                break;
              case "FASTEST_OF":
                userPoints = Result.iMinOf(participantSetResults);
                break;
              default:
                break;
            }

            setSummary.solve.results[pid] = new Result(userPoints).toIResult();
            setSummaryRow.setSummary = setSummary;
          }
        }
      }

      rows.push(setSummaryRow);
    }
    return rows;
  }, [match, raceSettings, participants]);

  return (
    <div className={cn("flex flex-col bg-inherit", className)}>
      <div className="flex-none my-1 text-foreground text-2xl">Time List</div>
      <Table className="w-full border-collapse bg-inherit">
        <TableHeader className="sticky top-0 z-10 shadow-sm bg-inherit">
          <SummaryDialog>
            <TableRow className="bg-inherit cursor-pointer hover:underline">
              {raceSettings.roomFormat !== "CASUAL" && (
                <TableHead className="text-center w-10">Set</TableHead>
              )}
              <TableHead className="text-center w-10">Solve</TableHead>
              {Object.entries(participants).map(([pid, participant]) => (
                <TableHead key={pid} className="text-center">
                  {teamSettings.teamsEnabled
                    ? (participant as IRoomTeam).team.name
                    : (participant as IRoomUser).user.userName}
                </TableHead>
              ))}
            </TableRow>
          </SummaryDialog>
        </TableHeader>
        <TableBody className="flex-1 overflow-auto">
          {rows.map((_, i, arr) => {
            //render in reverse order without explicit reversal
            const setIndex = arr.length - 1 - i;
            const setSummaryRow = arr[setIndex];
            const setSummary = setSummaryRow.setSummary;
            return (
              <Fragment key={setIndex}>
                {setSummary && (
                  <SetDialog key={setSummary.index} setIndex={setSummary.index}>
                    <TableRow className="font-bold cursor-pointer hover:underline">
                      <TableCell className="w-10">{setSummary.index}</TableCell>
                      {raceSettings.roomFormat !== "CASUAL" &&
                        (raceSettings.setFormat === "BEST_OF" ||
                          raceSettings.setFormat === "FIRST_TO") && (
                          <TableCell className="w-10">Pts</TableCell>
                        )}
                      {raceSettings.roomFormat !== "CASUAL" &&
                        raceSettings.setFormat === "AVERAGE_OF" && (
                          <TableCell className="w-10">Avg</TableCell>
                        )}
                      {raceSettings.roomFormat !== "CASUAL" &&
                        raceSettings.setFormat === "MEAN_OF" && (
                          <TableCell className="w-10">Mean</TableCell>
                        )}
                      {raceSettings.roomFormat !== "CASUAL" &&
                        raceSettings.setFormat === "FASTEST_OF" && (
                          <TableCell className="w-10">Best</TableCell>
                        )}

                      {Object.keys(participants).map((pid) => {
                        const participantResult = setSummary.solve.results[pid];
                        return (
                          <TableCell key={pid}>
                            <div className="flex flex-row text-center items-center justify-center">
                              {setSummary.winners.includes(pid) && <Crown />}
                              <div>
                                {raceSettings.roomFormat !== "CASUAL" &&
                                  (raceSettings.setFormat === "AVERAGE_OF" ||
                                    raceSettings.setFormat === "MEAN_OF" ||
                                    raceSettings.setFormat === "FASTEST_OF") &&
                                  (participantResult
                                    ? Result.fromIResult(
                                        participantResult
                                      ).toString()
                                    : "DNF")}
                                {raceSettings.roomFormat !== "CASUAL" &&
                                  (raceSettings.setFormat === "BEST_OF" ||
                                    raceSettings.setFormat === "FIRST_TO") &&
                                  (setSummary.solve.results[pid]
                                    ? Result.fromIResult(
                                        participantResult
                                      ).getTime()
                                    : 0)}
                              </div>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </SetDialog>
                )}
                {setSummaryRow.solveSummaries.map((_, j, solves) => {
                  const solveIndex = solves.length - 1 - j;
                  const solve = solves[solveIndex];

                  // row is a solve row
                  return (
                    <SolveDialog
                      key={solveIndex}
                      solve={solve}
                      setIndex={setIndex + 1}
                    >
                      <TableRow className="cursor-pointer hover:underline">
                        {raceSettings.roomFormat !== "CASUAL" && (
                          <TableCell className="w-10">{setIndex + 1}</TableCell>
                        )}
                        <TableCell className="w-10">{solveIndex + 1}</TableCell>
                        {Object.keys(participants).map((pid) => {
                          let cellClassName = "";
                          if (solve.winners?.includes(pid)) {
                            cellClassName += "font-bold";
                          }
                          return (
                            <TableCell key={pid} className={cellClassName}>
                              <div className="flex flex-row text-center items-center justify-center">
                                <div>
                                  {solve.solve.results[pid]
                                    ? Result.fromIResult(
                                        solve.solve.results[pid]
                                      ).toString()
                                    : "---"}
                                </div>
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </SolveDialog>
                  );
                })}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
