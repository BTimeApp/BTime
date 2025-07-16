"use client";
import { useEffect, useState } from "react";
import { IRoom } from "@/types/room";
import {
  MATCH_FORMAT_ABBREVIATION_MAP,
  SET_FORMAT_ABBREVIATION_MAP,
} from "@/types/room";
import JoinRoomButton from "@/components/index/join-room-button";

export default function RoomListing() {
  const [rooms, setRooms] = useState<Map<string, IRoom>>(
    new Map<string, IRoom>()
  );

  // run once on mount
  // TODO: maybe have a reload button on the page to refresh
  useEffect(() => {
    const fetchRooms = async () => {
      const response = await fetch("/api/getrooms");
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const json: [string, IRoom][] = await response.json();
      setRooms(new Map<string, IRoom>(json));
    };
    fetchRooms();
  }, []);

  return (
    <div className="flex flex-col px-3">
      <h2 className="font-bold text-center text-xl">Rooms</h2>
      <div className="px-1">
        <div className="grid grid-cols-6 gap-3 py-1 text-left">
            <div>Room Name</div>
            <div>Event</div>
            <div>Mode</div>
            <div>Match Format</div>
            <div>Set Format</div>
        </div>
        {rooms.size != 0 ? (
          [...rooms.entries()].map(([roomId, room]) => (
            <div key={roomId} className="grid grid-cols-6 gap-3 py-1 text-left items-center">
              <div>{room.roomName}</div>
              <div>{room.roomEvent}</div>
              <div>{room.roomFormat}</div>
              {room.roomFormat === "RACING" ? (
                <>
                  <div>
                    {MATCH_FORMAT_ABBREVIATION_MAP.get(room.matchFormat!)! +
                      room.nSets!}
                  </div>
                  <div>
                    {SET_FORMAT_ABBREVIATION_MAP.get(room.setFormat!)! +
                      room.nSolves!}
                  </div>
                </>
              ) : (
                <></>
              )}
              {/* TODO: allow users to only need to type password for room once */}
              {/* {room.isPrivate ? (
                <JoinPrivateRoomDialog roomId={room.id} roomName={room.roomName}></JoinPrivateRoomDialog>
              ) : (
                <JoinRoomButton roomId={room.id}></JoinRoomButton>
              )} */}
              <div className="col-start-6">
                <JoinRoomButton roomId={room.id}></JoinRoomButton>
              </div>
              
            </div>
          ))
        ) : (
          <div className="text-center">
            No rooms currently available!
          </div>
        )}
      </div>
    </div>
  );
}
