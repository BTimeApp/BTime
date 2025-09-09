"use client";
import { useEffect, useState } from "react";
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
import { Card, CardContent, CardHeader } from "../ui/card";

export default function RoomListing() {
  const [rooms, setRooms] = useState<Map<string, IRoomSummary>>(
    new Map<string, IRoomSummary>()
  );

  async function updateRooms() {
    const response = await fetch("/api/v0/rooms", {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const json: [string, IRoomSummary][] = await response.json();
    setRooms(new Map<string, IRoomSummary>(json));
  }

  // run once on mount
  // TODO: maybe have a reload button on the page to refresh
  useEffect(() => {
    updateRooms();
  }, []);

  return (
    <Card className="h-60 lg:h-120 w-full flex flex-col px-3 gap-1 rounded-lg shadow-lg p-1 bg-container-1">
      <CardHeader className="shrink-0">
        <div className="flex flex-row px-1">
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
            <div className="grid grid-cols-10 gap-3 px-1 py-1 text-left shadow-sm rounded-sm sticky top-0 bg-container-1">
              <div className="col-span-3">Room Name</div>
              <div className="col-start-5">Users</div>
              <div>Event</div>
              <div>Format</div>
              <div className="col-start-9">Privacy</div>
            </div>
            {rooms.size != 0 ? (
              [...rooms.entries()].map(([roomId, room]) => (
                <div
                  key={roomId}
                  className="grid grid-cols-10 gap-3 px-1 py-1 text-left items-center shadow-sm rounded-sm"
                >
                  <div className="col-span-3">{room.roomName}</div>
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

                  <div className="col-start-9 flex flex-row">
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
    </Card>
  );
}
