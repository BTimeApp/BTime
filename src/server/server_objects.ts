import { IRoom } from "@/types/room";
import { IUser } from "@/types/user";

// We extract all server-side global objects here to avoid circular dependencies
// TODO - move to using something like redis to store this information
export const rooms: Map<string, IRoom> = new Map<string, IRoom>(); // In-memory room store
export const users: Map<string, IUser> = new Map<string, IUser>(); // In-memory user store
