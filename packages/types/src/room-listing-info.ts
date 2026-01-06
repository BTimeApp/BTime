import type {
  IRoom,
  RaceSettings,
  TeamSettings,
  Visibility,
  RoomEvent,
} from "./room.js";
import type { IRoomUser } from "./room-participant.js";

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
    numUsers: Object.values(room.users).filter(
      (roomUser: IRoomUser) => roomUser.active
    ).length,
    roomEvent: room.settings.roomEvent,
    raceSettings: room.settings.raceSettings,
    teamSettings: room.settings.teamSettings,
    visibility: room.settings.access.visibility,
    maxUsers: room.settings.maxUsers,
  };

  return roomSummary;
}
