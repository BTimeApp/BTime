import { IRoom } from "@/types/room";
import { RoomEvent, RoomFormat, MatchFormat, SetFormat } from "@/types/room";

/**
 * A summary of the room used for things such as the room listing on the home page.
 */
export interface IRoomSummary {
  id: string;
  roomName: string;
  numUsers: number; //number of active users
  roomEvent: RoomEvent;
  roomFormat: RoomFormat;
  matchFormat?: MatchFormat; //how many sets to take to win
  setFormat?: SetFormat; //how to win a set
  nSets?: number; //number for match format
  nSolves?: number; //number for set format
  isPrivate: boolean;
}

export function roomToSummary(room: IRoom): IRoomSummary {
  const roomSummary: IRoomSummary = {
    id: room.id,
    roomName: room.roomName,
    numUsers: Object.values(room.users).filter((roomUser) => roomUser.active)
      .length,
    roomEvent: room.roomEvent,
    roomFormat: room.roomFormat,
    isPrivate: room.isPrivate,
  };
  if (roomSummary.roomFormat === "RACING") {
    roomSummary.matchFormat = room.matchFormat;
    roomSummary.setFormat = room.setFormat;
    roomSummary.nSets = room.nSets;
    roomSummary.nSolves = room.nSolves;
  }

  return roomSummary;
}
