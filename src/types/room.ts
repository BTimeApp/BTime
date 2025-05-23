import { Types, Document } from 'mongoose';
import { IUser } from '@/types/user';
import { IRoomUser } from '@/types/roomUser';
import { ISolve } from '@/types/solve';

//defines all legal events
export const ROOM_EVENTS = ['333', '222', '444', '555', '666', '777', 'megaminx', 'pyraminx', 'skewb', 'clock', 'sq1', '3oh', '3bld', '4bld', '5bld'];

//defines all legal formats (more to come hopefully)
export const ROOM_FORMATS = [
    'casual', //no points or score, just cubing
    'racing', //racing with sets and points
    //TODO: add a competitive mode with ranking, etc
];

//match formats - how to win a race based on number of sets won
export const MATCH_FORMATS = [
    'best_of_n', //best of n sets wins
    'first_to_n', //first to n sets wins
];

//set formats - how to win a set based on the solves
export const SET_FORMATS = [
    'best_of_n', //best of n solves
    'first_to_n', //first to n solves
    'average_of_n', //average of n format (mean when dropping max and min) - n >= 3
    'mean_of_n', //mean of n format
    //TOdO - support other formats like total time differential
]

//all room states 
export const ROOM_STATES = [
    'waiting', //like a pregame lobby - waiting for people before host starts
    'started', //ingame - doing solves
    'finished' //either when host ends the room, or when all attempts are done
]; 

export type RoomEvent = (typeof ROOM_EVENTS)[number];
export type RoomFormat = (typeof ROOM_FORMATS)[number];
export type MatchFormat = (typeof MATCH_FORMATS)[number];
export type SetFormat = (typeof SET_FORMATS)[number];
export type RoomState = (typeof ROOM_STATES)[number];

export interface IRoom extends Document{
    roomName: string;
    host: Types.ObjectId | IUser;
    competitors: IRoomUser[];
    spectators: IRoomUser[];
    solves: ISolve[];
    roomEvent: RoomEvent; 
    roomFormat: RoomFormat; 
    isPrivate: boolean;
    state: string;
    password?: string;
};