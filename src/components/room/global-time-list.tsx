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
import { SummaryDialog, SetDialog, SolveDialog } from "@/components/room/result-dialogs";
import { useRoomStore } from "@/context/room-context";
import { useMemo } from "react";

export default function GlobalTimeList({ className }: { className: string }) {
  const [users, teams, solves, raceSettings, teamSettings] =
    useRoomStore((s) => [
      s.users,
      s.teams,
      s.solves,
      s.raceSettings,
      s.teamSettings,
    ]);

  const participants = useMemo(() => {
    return teamSettings.teamsEnabled ? teams : users;
  }, [teamSettings, teams, users]);

  /**
   * Potential strategy for incorporating "summary" rows
   *
   * Create a list rows[]. both Solves and Summaries can be represented by IRoomSolve abstraction
   *
   * Iterate through solves and push to rows[]. We inject a summary when:
   *   - current solve and next solve have diff set indices OR
   *   - current solve has setWinners with nonzero length OR
   *   - current solve has matchWinners with nonzero length OR
   *   - current solve's solveIndex === nSolves && setIndex === nSets (this is nec since last solve in solves doesn't get caught in condition 1)
   */
  const rows: IRoomSolve[] = useMemo(() => {
    const rows = [];
    for (let i = 0; i < solves.length; i++) {
      const solve = solves[i];

      // 1. push solve to rows
      rows.push(solve);

      // 2. check if we should generate a set summary row after this solve. if so, push onto rows
      if (raceSettings.roomFormat !== "CASUAL") {
        if (
          (i < solves.length - 1 &&
            solves[i].setIndex !== solves[i + 1].setIndex) ||
          (solve.setWinners && solve.setWinners?.length > 0) ||
          (solve.matchWinners && solve.matchWinners?.length > 0) ||
          (solve.finished &&
            solve.setIndex === raceSettings.nSets &&
            solve.solveIndex >= raceSettings.nSolves! &&
            (raceSettings.setFormat === "FASTEST_OF" ||
              raceSettings.setFormat === "MEAN_OF" ||
              raceSettings.setFormat === "AVERAGE_OF"))
        ) {
          const roomSummaryRow: IRoomSolve = {
            solve: {
              id: -1,
              scrambles: [],
              attempts: {},
              results: {},
            },
            setIndex: solve.setIndex,
            solveIndex: -1,
            finished: true,
            solveWinners: [],
            setWinners: solve.setWinners,
            matchWinners: solve.matchWinners,
          };

          /**
           * TODO: consider moving this set calculation logic into a field within IRoom that represents a set
           */

          const setSolves = solves.filter(
            (roomSolve) => roomSolve.setIndex === solve.setIndex
          );

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
                  solve.solveWinners?.includes(pid)
                ).length;
                break;
              case "FIRST_TO":
                userPoints = setSolves.filter((solve) =>
                  solve.solveWinners?.includes(pid)
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

            roomSummaryRow.solve.results[pid] = new Result(
              userPoints
            ).toIResult();
          }

          if (solve.setWinners && solve.setWinners?.length > 0) {
            roomSummaryRow.setWinners = solve.setWinners;
          }
          if (solve.matchWinners && solve.matchWinners?.length > 0) {
            roomSummaryRow.matchWinners = solve.matchWinners;
          }

          rows.push(roomSummaryRow);
        }
      }
    }
    return rows;
  }, [solves, raceSettings, participants]);

  return (
    <div className={cn("flex flex-col bg-inherit", className)}>
      <div className="flex-1 text-foreground text-2xl">Time List</div>
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
            const index = arr.length - 1 - i;
            const solve = arr[index];

            const solveWinners: string[] | undefined = solve.solveWinners;
            const setWinners: string[] | undefined = solve.setWinners;
            const matchWinners: string[] | undefined = solve.matchWinners;

            if (solve.solveIndex === -1) {
              return (
                <SetDialog key={index} setIndex={solve.setIndex}>
                  <TableRow className="font-bold cursor-pointer hover:underline">
                    <TableCell className="w-10">{solve.setIndex}</TableCell>
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
                      const participantResult = solve.solve.results[pid];
                      return (
                        <TableCell key={pid}>
                          <div className="flex flex-row text-center items-center justify-center">
                            {(setWinners?.includes(pid) ||
                              matchWinners?.includes(pid)) && <Crown />}
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
                                (solve.solve.results[pid]
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
              );
            }

            // row is a solve row
            return (
              <SolveDialog key={index} solve={solve}>
                <TableRow className="cursor-pointer hover:underline">
                  {raceSettings.roomFormat !== "CASUAL" && (
                    <TableCell className="w-10">{solve.setIndex}</TableCell>
                  )}
                  <TableCell className="w-10">{solve.solveIndex}</TableCell>
                  {Object.keys(participants).map((pid) => {
                    let cellClassName = "";
                    if (solveWinners?.includes(pid)) {
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
        </TableBody>
      </Table>
    </div>
  );
}
