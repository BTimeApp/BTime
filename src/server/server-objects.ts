import { IRoom } from "@/types/room";
import { IUser } from "@/types/user";

export interface UserSession {
  timeout?: NodeJS.Timeout;
}

// We extract all server-side global objects here to avoid circular dependencies
// TODO - move to using something like redis to store this information
export const rooms: Map<string, IRoom> = new Map<string, IRoom>(); // In-memory room store
export const users: Map<string, IUser> = new Map<string, IUser>(); // In-memory user store
//<userId: <roomId: session>>
export const userRoomSessions: Map<string, Map<string, UserSession>> = new Map<string, Map<string, UserSession>>();
//<userId: {socket ID}>
export const userSessions: Map<string, Set<string>> = new Map<string, Set<string>>();