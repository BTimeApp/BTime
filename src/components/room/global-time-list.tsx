import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Crown } from "lucide-react";
import SolveDialog from "@/components/room/solve-dialog";
import { IRoomUser } from "@/types/room-participant";
import { IRoomSolve } from "@/types/room-solve";
import { RaceSettings, RoomEvent } from "@/types/room";
import { Result } from "@/types/result";
import { cn } from "@/lib/utils";
import SetDialog from "@/components/room/set-dialog";
import SummaryDialog from "@/components/room/summary-dialog";

type GlobalTimeListProps = {
  roomName: string;
  users: IRoomUser[];
  solves: IRoomSolve[];
  roomEvent: RoomEvent;
  raceSettings: RaceSettings;
  userId?: string;
  className?: string;
};

export default function GlobalTimeList({
  roomName,
  users,
  solves,
  roomEvent,
  raceSettings,
  userId,
  className,
}: GlobalTimeListProps) {
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
  const rows: IRoomSolve[] = [];
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

        for (const roomUser of users) {
          //user's results for the given set
          const userSetResults = setSolves.map((solve) =>
            Object.hasOwn(solve.solve.results, roomUser.user.id)
              ? solve.solve.results[roomUser.user.id]
              : new Result(0, "DNF").toIResult()
          );

          //calculate summary metric
          let userPoints = Infinity;
          switch (raceSettings.setFormat) {
            case "BEST_OF":
              userPoints = setSolves.filter((solve) =>
                solve.solveWinners?.includes(roomUser.user.id)
              ).length;
              break;
            case "FIRST_TO":
              userPoints = setSolves.filter((solve) =>
                solve.solveWinners?.includes(roomUser.user.id)
              ).length;
              break;
            case "AVERAGE_OF":
              userPoints = Result.iAverageOf(userSetResults);
              break;
            case "MEAN_OF":
              userPoints = Result.iMeanOf(userSetResults);
              break;
            case "FASTEST_OF":
              userPoints = Result.iMinOf(userSetResults);
              break;
            default:
              break;
          }

          roomSummaryRow.solve.results[roomUser.user.id] = new Result(
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

  return (
    <div className={cn("flex flex-col bg-inherit", className)}>
      <div className="flex-1 text-foreground text-2xl">Time List</div>
      <Table className="w-full border-collapse bg-inherit">
        <TableHeader className="sticky top-0 z-10 shadow-sm bg-inherit">
          <SummaryDialog
            roomName={roomName}
            scrambles={solves.map((solve) =>
              userId ? solve.solve.attempts[userId]?.scramble ?? "" : ""
            )}
            results={solves.map((solve) =>
              userId && solve.solve.results[userId]
                ? solve.solve.results[userId]
                : { time: 0, penalty: "DNF" }
            )}
          >
            <TableRow className="bg-inherit">
              {raceSettings.roomFormat !== "CASUAL" && (
                <TableHead className="text-center w-10">Set</TableHead>
              )}
              <TableHead className="text-center w-10">Solve</TableHead>
              {users.map((user) => (
                <TableHead key={user.user.id} className="text-center">
                  {user.user.userName}
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
              //extract solves from this set
              const setSolves = solves.filter(
                (s) => s.setIndex === solve.setIndex
              );
              // row is a summary row
              return (
                <SetDialog
                  roomName={roomName}
                  key={index}
                  setIndex={solve.setIndex}
                  scrambles={setSolves.map((solve) =>
                    userId ? solve.solve.attempts[userId].scramble : ""
                  )}
                  results={setSolves.map((solve) =>
                    userId && solve.solve.results[userId] != null
                      ? solve.solve.results[userId]
                      : { time: 0, penalty: "DNF" }
                  )}
                >
                  <TableRow className="font-bold">
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

                    {users.map((user) => {
                      return (
                        <TableCell key={user.user.id}>
                          <div className="flex flex-row text-center items-center justify-center">
                            {(setWinners?.includes(user.user.id) ||
                              matchWinners?.includes(user.user.id)) && (
                              <Crown />
                            )}
                            <div>
                              {raceSettings.roomFormat !== "CASUAL" &&
                                (raceSettings.setFormat === "AVERAGE_OF" ||
                                  raceSettings.setFormat === "MEAN_OF" ||
                                  raceSettings.setFormat === "FASTEST_OF") &&
                                (solve.solve.results[user.user.id]
                                  ? Result.fromIResult(
                                      solve.solve.results[user.user.id]
                                    ).toString()
                                  : "DNF")}
                              {raceSettings.roomFormat !== "CASUAL" &&
                                (raceSettings.setFormat === "BEST_OF" ||
                                  raceSettings.setFormat === "FIRST_TO") &&
                                (solve.solve.results[user.user.id]
                                  ? Result.fromIResult(
                                      solve.solve.results[user.user.id]
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
              <SolveDialog
                roomName={roomName}
                key={index}
                setIndex={
                  raceSettings.roomFormat === "CASUAL"
                    ? undefined
                    : solve.setIndex
                }
                solveIndex={solve.solveIndex}
                // as of now, we only give the scramble for this user - eventually generalize this whole code to all users
                scramble={userId ? (solve.solve.attempts[userId]?.scramble ?? "") : ""}
                event={roomEvent}
                result={userId ? solve.solve.results[userId] : undefined}
              >
                <TableRow>
                  {raceSettings.roomFormat !== "CASUAL" && (
                    <TableCell className="w-10">{solve.setIndex}</TableCell>
                  )}
                  <TableCell className="w-10">{solve.solveIndex}</TableCell>
                  {users.map((user) => {
                    let cellClassName = "";
                    if (solveWinners?.includes(user.user.id)) {
                      cellClassName += "font-bold";
                    }
                    return (
                      <TableCell key={user.user.id} className={cellClassName}>
                        <div className="flex flex-row text-center items-center justify-center">
                          <div>
                            {solve.solve.results[user.user.id]
                              ? Result.fromIResult(
                                  solve.solve.results[user.user.id]
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
