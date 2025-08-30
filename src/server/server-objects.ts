import { IRoom } from "@/types/room";
import { IUser } from "@/types/user";
import { UserSession } from "@/server/socket/socket-session";

// We extract all server-side global objects here to avoid circular dependencies
// TODO - move to using something like redis to store this information
export const rooms: Map<string, IRoom> = new Map<string, IRoom>(); // In-memory room store
export const users: Map<string, IUser> = new Map<string, IUser>(); // In-memory user store
// <roomId: <userId: session>>
export const roomSessions: Map<string, Map<string, UserSession>> = new Map<string, Map<string, UserSession>>();
// <userId: session>
export const userSessions: Map<string, UserSession> = new Map<string, UserSession>();