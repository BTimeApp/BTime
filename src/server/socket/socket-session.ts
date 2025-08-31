/**
 * This defines user sessions ig
 */

import { roomSessions, userSessions } from "@/server/server-objects";

export interface UserSession {
  timeout: NodeJS.Timeout;
}

const USER_SESSION_TTL = 11000;
const ROOM_SESSION_TTL = 5000;

export function createUserSession(
  userId: string,
  timeoutCallback: (userId: string) => void
) {
  // check if user session exists
  if (userSessions.has(userId)) {
    heartbeatUserSession(userId);
    return;
  }

  userSessions.set(userId, {
    timeout: setTimeout(() => {
      // delete user session first
      userSessions.delete(userId);

      // invoke timeout callback 
      timeoutCallback(userId);
    }, USER_SESSION_TTL),
  });
}

export function createRoomSession(
    userId: string,
    roomId: string,
    timeoutCallback: (userId: string, roomId: string) => void
  ) {
    // check if room session exists
    if (roomSessions.get(roomId)?.has(userId)) {
      heartbeatRoomSession(userId, roomId);
      return;
    }

    if (!roomSessions.has(roomId)) {
        roomSessions.set(roomId, new Map<string, UserSession>());
    }
  
    roomSessions.get(roomId)?.set(userId, {
      timeout: setTimeout(() => {
        // delete user session first
        roomSessions.get(roomId)?.delete(userId);
  
        // invoke timeout callback 
        timeoutCallback(userId, roomId);
      }, ROOM_SESSION_TTL),
    });
  }

export function heartbeatUserSession(userId: string) {
    userSessions.get(userId)?.timeout.refresh();
}

export function heartbeatRoomSession(userId: string, roomId: string) {
    roomSessions.get(roomId)?.get(userId)?.timeout.refresh();
}
