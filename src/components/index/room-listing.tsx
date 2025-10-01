"use client";
import { useCallback, useEffect, useState } from "react";
import { IRoomSummary } from "@/types/room-listing-info";
import {
  MATCH_FORMAT_ABBREVIATION_MAP,
  SET_FORMAT_ABBREVIATION_MAP,
  ROOM_EVENT_DISPLAY_NAME_MAP,
  ROOM_EVENT_ICON_SRC_MAP,
} from "@/types/room";
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
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNextButton,
  PaginationPreviousButton,
} from "@/components/ui/pagination";
import { toast } from "sonner";

// # of rooms to fetch at once with pagination
const ROOM_WINDOW_SIZE = 20;

export default function RoomListing() {
  // the page number we are currently on. 1-indexed
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [rooms, setRooms] = useState<Map<string, IRoomSummary>>(
    new Map<string, IRoomSummary>()
  );

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
  const updateRooms = useCallback(async () => {
    // always try to fetch the rooms at the given page number.
    const res = await fetchRooms(pageNumber);

    if (res) {
      // update total pages number
      setTotalPages(res.totalPages);

      if (res.rooms != null) {
        setRooms(
          new Map<string, IRoomSummary>(
            (res.rooms as IRoomSummary[]).map((room) => [room.id, room])
          )
        );
      }

      // Reset to the number of pages that the response says exist. This will re-trigger the useEffect that wraps this callback.
      if (pageNumber > res.totalPages) {
        setPageNumber(res.totalPages);
      }
    }
  }, [pageNumber, fetchRooms]);

  const goToPreviousPage = useCallback(() => {
    setPageNumber(Math.max(pageNumber - 1, 1));
  }, [pageNumber]);

  const goToNextPage = useCallback(() => {
    setPageNumber(pageNumber + 1);
  }, [pageNumber]);

  useEffect(() => {
    // update current rooms
    updateRooms();
  }, [updateRooms]);

  return (
    <Card className="h-60 lg:h-120 w-full flex flex-col px-3 gap-1 rounded-lg shadow-lg p-1 bg-container-1">
      <CardHeader className="shrink-0">
        <div className="flex flex-row px-1">
          <div>
            {pageNumber} of {totalPages}
          </div>
          <h2 className="grow font-semibold text-center text-xl">Rooms</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={updateRooms}>
                <RefreshCw />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div>Refresh</div>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>

      <CardContent className="px-1 flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="w-max">
            <div className="grid grid-cols-9 gap-3 px-1 py-1 text-left shadow-sm rounded-sm sticky top-0 bg-container-1">
              <div className="col-span-2">Room Name</div>
              <div className="col-start-4">Users</div>
              <div>Event</div>
              <div>Format</div>
              <div className="col-start-8">Privacy</div>
            </div>
            {rooms.size != 0 ? (
              [...rooms.entries()].map(([roomId, room]) => (
                <div
                  key={roomId}
                  className="grid grid-cols-9 gap-3 px-1 py-1 text-left items-center shadow-sm rounded-sm"
                >
                  <div className="col-span-2">{room.roomName}</div>
                  <div>
                    <JoinRoomButton roomId={room.id}></JoinRoomButton>
                  </div>
                  <div className="flex flex-row">
                    <User />
                    <div>{room.numUsers}</div>
                  </div>
                  <div className="flex flex-row">
                    <span
                      className={`cubing-icon ${ROOM_EVENT_ICON_SRC_MAP.get(
                        room.roomEvent
                      )}`}
                    />
                    <div>{ROOM_EVENT_DISPLAY_NAME_MAP.get(room.roomEvent)}</div>
                  </div>
                  <div>{room.roomFormat}</div>
                  <div className="grid grid-rows-2">
                    {room.roomFormat === "RACING" ? (
                      <>
                        <div>
                          {MATCH_FORMAT_ABBREVIATION_MAP.get(
                            room.matchFormat!
                          )! + room.nSets!}
                        </div>
                        <div>
                          {SET_FORMAT_ABBREVIATION_MAP.get(room.setFormat!)! +
                            room.nSolves!}
                        </div>
                      </>
                    ) : (
                      <></>
                    )}
                  </div>

                  <div className="col-start-8 flex flex-row">
                    {room.isPrivate ? (
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
          <PaginationContent>
            <PaginationItem>
              <PaginationPreviousButton onClick={goToPreviousPage} />
            </PaginationItem>
            <PaginationItem>
              <PaginationButton>{pageNumber}</PaginationButton>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNextButton onClick={goToNextPage} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </CardFooter>
    </Card>
  );
}
