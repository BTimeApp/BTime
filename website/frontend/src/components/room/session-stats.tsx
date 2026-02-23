import type { IResult, IRoomSolve } from "@btime/types";

import { useRoomStore } from "@/context/room-context";
import { cn } from "@/lib/utils";
import { Result } from "@btime/lib";
import { useMemo } from "react";

type SessionStatsProps = {
  userId: string;
  className?: string;
};

function extractUserResultFromRoomSolve(
  solve: IRoomSolve,
  userId: string
): IResult {
  if (
    solve.solve.attempts[userId] == null ||
    !solve.solve.attempts[userId].finished
  ) {
    return {
      time: 0,
      penalty: "DNF",
    };
  }

  return solve.solve.attempts[userId].result;
}

/**
 * A component that reads from the current match and computes sessions stats for a given user.
 *
 * The offered stats are minimal (on purpose), as the main offering of btime is live head-to-head cubing, not necessarily individual stats.
 * Supported stats:
 *  - overall mean
 *  - current ao5
 */
export default function SessionStats({ userId, className }: SessionStatsProps) {
  const match = useRoomStore((s) => s.match);

  //only include finished solves
  const solves: IRoomSolve[] = useMemo(
    () => match.sets.flatMap((set) => set.solves).filter((x) => x.finished),
    [match]
  );

  const allUserResults: IResult[] = useMemo(() => {
    return solves.map((solve) => extractUserResultFromRoomSolve(solve, userId));
  }, [solves, userId]);

  const userMean: string = useMemo(() => {
    if (allUserResults.length === 0) {
      return "---";
    }
    return Result.timeToString(Result.iMeanOf(allUserResults));
  }, [allUserResults]);

  const userAo5: string = useMemo(() => {
    if (allUserResults.length < 5) {
      return "---";
    }

    const results = allUserResults.slice(-5);
    return Result.timeToString(Result.iAverageOf(results));
  }, [allUserResults]);

  return (
    <div className={cn("flex flex-col", className)}>
      <p>Session Mean: {userMean}</p>
      <p>Current Ao5: {userAo5}</p>
    </div>
  );
}
