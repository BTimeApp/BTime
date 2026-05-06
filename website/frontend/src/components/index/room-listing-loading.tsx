import LoadingSpinner from "@/components/common/loading-spinner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function RoomListingLoading({
  className,
}: {
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "h-120 w-full flex flex-col px-3 gap-1 rounded-lg shadow-lg p-1 bg-container-1",
        className,
      )}
    >
      <CardHeader className="shrink overflow-x-hidden">
        <div className="flex flex-row px-1 min-w-0">
          <h2 className="grow font-semibold truncate text-center text-xl">
            Rooms
          </h2>
        </div>
      </CardHeader>
      <CardContent className="px-1 flex-1 flex flex-col items-center justify-center min-h-0 w-full overflow-hidden">
        <LoadingSpinner className="size-12" />
      </CardContent>
    </Card>
  );
}
