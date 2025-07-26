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
import { IRoomUser } from "@/types/room-user";
import { IRoomSolve } from "@/types/room-solve";
import { RoomEvent, RoomFormat } from "@/types/room";
import { Result } from "@/types/result";

type GlobalTimeListProps = {
  users: IRoomUser[];
  solves: IRoomSolve[];
  roomFormat: RoomFormat;
  roomEvent: RoomEvent;
};

export default function GlobalTimeList({
  users,
  solves,
  roomFormat,
  roomEvent,
}: GlobalTimeListProps) {
  return (
    <div className="max-h-[50%] w-full mt-auto flex flex-col bg-inherit">
      <div className="flex-1 text-foreground text-2xl">Time List</div>
      <Table className="w-full border-collapse bg-inherit">
        <TableHeader className="sticky top-0 z-10 shadow-sm bg-inherit">
          <TableRow className="bg-inherit">
            {roomFormat !== "CASUAL" && (
              <TableHead className="text-center w-10">Set</TableHead>
            )}
            <TableHead className="text-center w-10">Solve</TableHead>
            {users.map((user) => (
              <TableHead key={user.user.id} className="text-center">
                {user.user.userName}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="flex-1 overflow-auto">
          {solves.map((_, i, arr) => {
            //render in reverse order without explicit reversal
            const index = arr.length - 1 - i;
            const solve = arr[index];

            const solveWinner: string | undefined = solve.solveWinner;
            const setWinners: string[] | undefined = solve.setWinners;

            return (
              <SolveDialog
                key={index}
                setIndex={roomFormat === "CASUAL" ? undefined : solve.setIndex}
                solveIndex={solve.solveIndex}
                scramble={solve.solve.scramble}
                event={roomEvent}
              >
                <TableRow>
                  {roomFormat !== "CASUAL" && (
                    <TableCell className="w-10">{solve.setIndex}</TableCell>
                  )}
                  <TableCell className="w-10">{solve.solveIndex}</TableCell>
                  {users.map((user) => {
                    let cellClassName = "";
                    if (solveWinner == user.user.id) {
                      cellClassName += "font-bold";
                    }
                    return (
                      <TableCell key={user.user.id} className={cellClassName}>
                        <div className="flex flex-row text-center items-center justify-center">
                          {setWinners?.includes(user.user.id) && <Crown />}
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
