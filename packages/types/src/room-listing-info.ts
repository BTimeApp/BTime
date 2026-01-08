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
