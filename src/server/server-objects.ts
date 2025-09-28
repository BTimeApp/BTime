import { IRoom } from "@/types/room";

// We extract all server-side global objects here to avoid circular dependencies
// TODO - move to using something like redis to store this information
export const rooms: Map<string, IRoom> = new Map<string, IRoom>(); // In-memory room store
// export const users: Map<string, IUserInfo> = new Map<string, IUserInfo>(); // In-memory user store

// <roomId: Timeout>. meant to be triggered when all users leave a room.
export const roomTimeouts: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>();

// <userId: Set<socket id>>. 
// export const userSessions: Map<string, Set<string>> = new Map<string, Set<string>>();