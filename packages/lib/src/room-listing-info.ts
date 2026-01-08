import type { IRoom, IRoomSummary, IRoomUser } from "@btime/types";

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
