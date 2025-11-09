import { IRoom, RaceSettings, Visibility } from "@/types/room";
import { RoomEvent, RoomFormat, MatchFormat, SetFormat } from "@/types/room";

/**
 * A summary of the room used for things such as the room listing on the home page.
 */
export interface IRoomSummary {
  id: string;
  roomName: string;
  numUsers: number; //number of active users
  roomEvent: RoomEvent;
  raceSettings: RaceSettings;
  visibility: Visibility;
}

export function roomToSummary(room: IRoom): IRoomSummary {
  const roomSummary: IRoomSummary = {
    id: room.id,
    roomName: room.settings.roomName,
    numUsers: Object.values(room.users).filter((roomUser) => roomUser.active)
      .length,
    roomEvent: room.settings.roomEvent,
    raceSettings: room.settings.raceSettings,
    visibility: room.settings.access.visibility,
  };

  return roomSummary;
}
