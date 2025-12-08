import { IRoom, RaceSettings, TeamSettings, Visibility } from "@/types/room";
import { RoomEvent } from "@/types/room";

/**
 * A summary of the room used for things such as the room listing on the home page.
 */
export interface IRoomSummary {
  id: string;
  roomName: string;
  numUsers: number; //number of active users
  roomEvent: RoomEvent;
  raceSettings: RaceSettings;
  teamSettings: TeamSettings;
  visibility: Visibility;
  maxUsers: undefined | number;
}

export function roomToSummary(room: IRoom): IRoomSummary {
  const roomSummary: IRoomSummary = {
    id: room.id,
    roomName: room.settings.roomName,
    numUsers: Object.values(room.users).filter((roomUser) => roomUser.active)
      .length,
    roomEvent: room.settings.roomEvent,
    raceSettings: room.settings.raceSettings,
    teamSettings: room.settings.teamSettings,
    visibility: room.settings.access.visibility,
    maxUsers: room.settings.maxUsers,
  };

  return roomSummary;
}
