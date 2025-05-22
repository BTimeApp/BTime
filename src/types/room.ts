import { Types } from 'mongoose';
import { IUser } from '@/types/user';
import { IRoomUser } from '@/types/roomUser';
export const ROOM_EVENTS = ['333', '222', '444', '555', '666', '777', 'megaminx', 'pyraminx', 'skewb', 'clock', 'sq1', '3oh', '3bld', '4bld', '5bld'];
export const ROOM_FORMATS = ['casual', 'BoN', 'AoN'];

type RoomEvent = (typeof ROOM_EVENTS)[number];
type RoomFormat = (typeof ROOM_FORMATS)[number];
export interface IRoom extends Document{
    roomName: string;
    hostId: Types.ObjectId | IUser;
    competitors: IRoomUser[];
    spectators: IRoomUser[];
    event: RoomEvent; 
    format: RoomFormat; 
    isPrivate: boolean;
    state: string;
    password?: string;
};