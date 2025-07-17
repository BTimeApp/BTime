"use client";
import { useEffect, useState } from "react";
import { IRoom } from "@/types/room";
import {
  MATCH_FORMAT_ABBREVIATION_MAP,
  SET_FORMAT_ABBREVIATION_MAP,
  ROOM_EVENT_DISPLAY_NAME_MAP,
  ROOM_EVENT_ICON_SRC_MAP,
} from "@/types/room";
import JoinRoomButton from "@/components/index/join-room-button";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function RoomListing() {
  const [rooms, setRooms] = useState<Map<string, IRoom>>(
    new Map<string, IRoom>()
  );

  async function updateRooms() {
    const response = await fetch("/api/v0/rooms", {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const json: [string, IRoom][] = await response.json();
    setRooms(new Map<string, IRoom>(json));
  }

  // run once on mount
  // TODO: maybe have a reload button on the page to refresh
  useEffect(() => {
    updateRooms();
  }, []);

  return (
    <div className="flex flex-col px-3">
      <div className="flex flex-row">
        <h2 className="grow font-bold text-center text-xl">Rooms</h2>
        <Button variant="outline" size="sm" onClick={updateRooms}>
          <RefreshCw />
        </Button>
      </div>
      <div className="px-1">
        <div className="grid grid-cols-8 gap-3 px-1 py-1 text-left shadow-sm rounded-sm">
          <div className="col-span-3">Room Name</div>
          <div>Users</div>
          <div>Event</div>
          <div className="col-span-2">Format</div>
        </div>
        {rooms.size != 0 ? (
          [...rooms.entries()].map(([roomId, room]) => (
            <div
              key={roomId}
              className="grid grid-cols-8 gap-3 px-1 py-1 text-left items-center shadow-sm rounded-sm"
            >
              <div className="col-span-3">{room.roomName}</div>
              <div>{Object.keys(room.users).length}</div>
              <div className="flex flex-row">
                <span
                  className={`cubing-icon ${ROOM_EVENT_ICON_SRC_MAP.get(
                    room.roomEvent
                  )}`}
                ></span>
                <div>{ROOM_EVENT_DISPLAY_NAME_MAP.get(room.roomEvent)}</div>
              </div>
              <div className="col-span-2">
                {room.roomFormat}{" "}
                {room.roomFormat === "RACING" ? (
                  "(" + MATCH_FORMAT_ABBREVIATION_MAP.get(room.matchFormat!)! +
                  room.nSets! +
                  " " +
                  SET_FORMAT_ABBREVIATION_MAP.get(room.setFormat!)! +
                  room.nSolves! + ")"
                ) : (
                  ""
                )}
              </div>

              {/* TODO: allow users to only need to type password for room once */}
              {/* {room.isPrivate ? (
                <JoinPrivateRoomDialog roomId={room.id} roomName={room.roomName}></JoinPrivateRoomDialog>
              ) : (
                <JoinRoomButton roomId={room.id}></JoinRoomButton>
              )} */}
              <div className="col-start-8">
                <JoinRoomButton roomId={room.id}></JoinRoomButton>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center">No rooms currently available!</div>
        )}
      </div>
    </div>
  );
}
