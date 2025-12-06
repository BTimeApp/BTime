"use client";
import { useCallback, useEffect, useState, useTransition } from "react";
import { IRoomSummary } from "@/types/room-listing-info";
import { ROOM_EVENTS_INFO } from "@/types/room";
import JoinRoomButton from "@/components/index/join-room-button";
import { Button } from "@/components/ui/button";
import { RefreshCw, User, Globe, GlobeLock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationNextButton,
  PaginationPreviousButton,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { abbreviate, cn, displayText } from "@/lib/utils";
import LoadingSpinner from "../common/loading-spinner";

// # of rooms to fetch at once with pagination
const ROOM_WINDOW_SIZE = 20;

export default function RoomListing({ className }: { className?: string }) {
  // the page number we are currently on. 1-indexed
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [rooms, setRooms] = useState<Map<string, IRoomSummary>>(
    new Map<string, IRoomSummary>()
  );
  const [refreshPending, startRefreshTransition] = useTransition();
  const [previousPending, startPreviousTransition] = useTransition();
  const [nextPending, startNextTransition] = useTransition();

  const fetchRooms = useCallback(async (page: number) => {
    const res = await fetch(
      `/api/v0/rooms?page=${page}&limit=${ROOM_WINDOW_SIZE}`,
      {
        method: "GET",
      }
    );
    if (!res.ok) {
      toast.error("Couldn't load rooms.");
      return undefined;
    }
    return res.json();
  }, []);

  /**
   * Updates the rooms local state
   */
  const updateRooms = useCallback(
    async (pageNumber: number) => {
      const res = await fetchRooms(pageNumber);
      if (!res) return;

      setTotalPages(res.totalPages);

      if (pageNumber > res.totalPages) {
        setPageNumber(res.totalPages);
      } else {
        if (res.rooms != null) {
          setRooms(
            new Map(
              res.rooms.map((roomSummary: IRoomSummary) => [
                roomSummary.id,
                roomSummary,
              ])
            )
          );
        }
        setPageNumber(pageNumber);
      }
    },
    [fetchRooms]
  );

  const goToPreviousPage = useCallback(() => {
    updateRooms(Math.max(pageNumber - 1, 1));
  }, [pageNumber, updateRooms]);

  const goToNextPage = useCallback(() => {
    updateRooms(pageNumber + 1);
  }, [pageNumber, updateRooms]);

  useEffect(() => {
    // update current rooms
    updateRooms(1);
  }, [updateRooms]);

  return (
    <Card
      className={cn(
        "h-60 lg:h-120 w-full flex flex-col px-3 gap-1 rounded-lg shadow-lg p-1 bg-container-1",
        className
      )}
    >
      <CardHeader className="shrink-0">
        <div className="flex flex-row px-1">
          <div>
            {pageNumber} of {totalPages}
          </div>
          <h2 className="grow font-semibold text-center text-xl">Rooms</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={refreshPending}
                onClick={() => {
                  startRefreshTransition(() => {
                    updateRooms(pageNumber);
                  });
                }}
              >
                <RefreshCw
                  className={`${refreshPending ? "animate-spin" : ""}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div>Refresh</div>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>

      <CardContent className="px-1 flex-1 min-h-0 w-full overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="w-full min-w-max">
            <div className="grid grid-cols-9 gap-3 px-1 py-1 text-left shadow-sm rounded-sm sticky top-0 bg-container-1">
              <div className="col-span-2">Room Name</div>
              <div className="col-start-4">Users</div>
              <div>Event</div>
              <div>Format</div>
              <div className="col-start-8">Privacy</div>
            </div>
            {rooms.size != 0 ? (
              [...rooms.entries()].map(([roomId, roomSummary]) => (
                <div
                  key={roomId}
                  className="grid grid-cols-9 gap-3 px-1 py-1 text-left items-center shadow-sm rounded-sm"
                >
                  <div className="col-span-2">{roomSummary.roomName}</div>
                  <div>
                    <JoinRoomButton roomId={roomSummary.id}></JoinRoomButton>
                  </div>
                  <div className="flex flex-row">
                    <User />
                    <div>
                      {roomSummary.numUsers}
                      {roomSummary.maxUsers ? `/${roomSummary.maxUsers}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-row">
                    <span
                      className={`cubing-icon ${
                        ROOM_EVENTS_INFO[roomSummary.roomEvent].iconSrc
                      }`}
                    />
                    <div>
                      {ROOM_EVENTS_INFO[roomSummary.roomEvent].displayName}
                    </div>
                  </div>
                  <div className="grid grid-rows-2">
                    <div>
                      {displayText(roomSummary.raceSettings.roomFormat)}
                    </div>
                    <div>
                      {roomSummary.teamSettings.teamsEnabled ? "Teams" : "Solo"}
                    </div>
                  </div>
                  <div className="grid grid-rows-2">
                    {roomSummary.raceSettings.roomFormat === "RACING" ? (
                      <>
                        <div>
                          {abbreviate(roomSummary.raceSettings.matchFormat) +
                            roomSummary.raceSettings.nSets}
                        </div>
                        <div>
                          {abbreviate(roomSummary.raceSettings.setFormat) +
                            roomSummary.raceSettings.nSolves}
                        </div>
                      </>
                    ) : (
                      <></>
                    )}
                  </div>

                  <div className="col-start-8 flex flex-row">
                    {roomSummary.visibility === "PRIVATE" ? (
                      <>
                        <GlobeLock />
                        <div>Private</div>
                      </>
                    ) : (
                      <>
                        <Globe />
                        <div>Public</div>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center">No rooms currently available!</div>
            )}
          </div>
          <ScrollBar orientation="vertical" />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <Pagination>
          <div className="grid grid-cols-3 items-center">
            {pageNumber != 1 &&
              (previousPending ? (
                <LoadingSpinner className="size-6" />
              ) : (
                <PaginationPreviousButton
                  onClick={() => {
                    startPreviousTransition(() => {
                      goToPreviousPage();
                    });
                  }}
                />
              ))}
            <div className="col-start-2 text-center text-lg">{pageNumber}</div>
            {nextPending ? (
              <LoadingSpinner className="size-6" />
            ) : (
              <PaginationNextButton
                onClick={() => {
                  startNextTransition(() => {
                    goToNextPage();
                  });
                }}
              />
            )}
          </div>
        </Pagination>
      </CardFooter>
    </Card>
  );
}
