import { Types } from 'mongoose';
import { IUser } from '@/types/user';
import { IRoomUser } from '@/types/roomUser';
import { ISolve } from '@/types/solve';
import { format } from 'path';

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
    'best_of', //best of n sets wins
    'first_to', //first to n sets wins
];

export const MATCH_FORMAT_MAP = new Map<MatchFormat, string>([
    ['best_of', 'Best of'],
    ['first_to', 'First to']
]);

//set formats - how to win a set based on the solves
export const SET_FORMATS = [
    'best_of', //best of n solves
    'first_to', //first to n solves
    'average_of', //average of n format (mean when dropping max and min) - n >= 3
    'mean_of', //mean of n format
    //TOdO - support other formats like total time differential
];

export const SET_FORMAT_MAP = new Map<SetFormat, string>([
    ['best_of', 'Best of'],
    ['first_to', 'First to'],
    ['average_of', 'Average of'],
    ['mean_of', 'Mean of']
]);

export function getVerboseFormatText(roomFormat: RoomFormat, matchFormat: MatchFormat, setFormat: SetFormat, nSets: number, nSolves: number): string {
    if (roomFormat == "casual") {
        return "Enjoy endless solves in this casual room."
    } else {
        let formatText = "";
        if (nSets && nSets > 1) {
            switch(matchFormat) {
                case "best_of":
                    formatText += "Win the match by winning the most of " + nSets + " sets.";
                    break;
                case "first_to":
                    formatText += "Win the match by being the first to win " + nSets + " sets.";
                    break;
                default:
                    break;
            }
            formatText += "\n";
        } 
        switch(setFormat) {
            case 'best_of':
                formatText += "Win a set by winning the most of " + nSolves + " solves.";
                break;
            case 'first_to':
                formatText += "Win a set by being the first to win " + nSolves + " solves.";
                break;
            case 'average_of':
                formatText += "Win a set by having the best average of " + nSolves + " solves (best and worst times dropped).";
                break;
            case 'mean_of':
                formatText += "Win a set by having the best mean of " + nSolves + " solves.";
                break;
        }
        return formatText;
    }
}

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

export interface IRoom {
    roomName: string;
    host: Types.ObjectId | IUser;
    users: Record<string, IRoomUser>; //objectId (user) : IRoomUser. The key has to be a string b/c of mongoDB storage.
    solves: ISolve[][];
    currentSet: number; //the current set number (1-indexed)
    currentSolve: number; //the solve number WITHIN the current set (1-indexed)
    roomEvent: RoomEvent; 
    roomFormat: RoomFormat; 
    matchFormat?: MatchFormat; //how many sets to take to win
    setFormat?: SetFormat; //how to win a set
    nSets?: number; //number for match format
    nSolves?: number; //number for set format
    isPrivate: boolean;
    state: string;
    password?: string;
};