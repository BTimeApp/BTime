import type { Penalty } from "@btime/types";

import { cn } from "@/lib/utils";

type InspectionCountdownProps = {
  remainingTime: number; //in seconds
  penalty: Penalty;
  className?: string;
};

function InspectionCountdown({
  remainingTime,
  penalty = "OK",
  className,
}: InspectionCountdownProps) {
  return (
    <div
      className={cn(
        remainingTime <= 8 && "text-timer-warning",
        remainingTime <= 3 && "text-timer-notready",
        className
      )}
    >
      {penalty === "DNF"
        ? "DNF"
        : penalty === "+2"
        ? "+2"
        : remainingTime.toString()}
    </div>
  );
}

export default InspectionCountdown;
