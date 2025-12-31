import { RoomEventHandlers } from "@/types/socket_protocol";
import { RoomLogger } from "@/server/logging/logger";

/**
 * A static list of handler functions for all possible room events.
 * This list will change with the list of events defined in socket-protocol.
 * This file should raise development-time errors if not synced properly with that list.
 */
export const ROOM_EVENT_HANDLERS = {
  JOIN_ROOM: async () => {},
  UPDATE_ROOM: async () => {},
  UPDATE_SOLVE_STATUS: async () => {},
  START_LIVE_TIMER: async () => {},
  STOP_LIVE_TIMER: async () => {},

  TOGGLE_COMPETING: async (io, stores, roomId, userId, args) => {
    RoomLogger.info({ competing: args.competing }, "toggle competing received");
  },
  SUBMIT_RESULT: async () => {},

  CREATE_TEAMS: async () => {},
  DELETE_TEAM: async () => {},
  JOIN_TEAM: async () => {},
  LEAVE_TEAM: async () => {},

  START_ROOM: async () => {},
  REMATCH_ROOM: async () => {},
  RESET_ROOM: async () => {},

  NEW_SCRAMBLE: async () => {},
  FORCE_NEXT_SOLVE: async () => {},

  KICK_USER: async () => {},
  BAN_USER: async () => {},
  UNBAN_USER: async () => {},

  LEAVE_ROOM: async () => {},
} satisfies RoomEventHandlers;

type RoomEventKey = keyof typeof ROOM_EVENT_HANDLERS;

export function isRoomEventKey(event: string): event is RoomEventKey {
  return event in ROOM_EVENT_HANDLERS;
}
