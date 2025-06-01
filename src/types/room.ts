import { IUser } from '@/types/user';
import { IRoomUser } from '@/types/roomUser';
import { ISolve } from '@/types/solve';

//defines all legal events
export const ROOM_EVENTS = ['333', '222', '444', '555', '666', '777', 'megaminx', 'pyraminx', 'skewb', 'clock', 'sq1', '3oh', '3bld', '4bld', '5bld'];

//defines all legal formats (more to come hopefully)
export const ROOM_FORMATS = [
    'CASUAL', //no points or score, just cubing
    'RACING', //racing with sets and points
    //TODO: add a competitive mode with ranking, etc
];

//match formats - how to win a race based on number of sets won
export const MATCH_FORMATS = [
    'BEST_OF', //best of n sets wins
    'FIRST_TO', //first to n sets wins
];

export const MATCH_FORMAT_MAP = new Map<MatchFormat, string>([
    ['BEST_OF', 'Best of'],
    ['FIRST_TO', 'First to']
]);

//set formats - how to win a set based on the solves
export const SET_FORMATS = [
    'BEST_OF', //best of n solves
    'FIRST_TO', //first to n solves
    'AVERAGE_OF', //average of n format (mean when dropping max and min) - n >= 3
    'MEAN_OF', //mean of n format
    //TOdO - support other formats like total time differential
];

export const SET_FORMAT_MAP = new Map<SetFormat, string>([
    ['BEST_OF', 'Best of'],
    ['FIRST_TO', 'First to'],
    ['AVERAGE_OF', 'Average of'],
    ['MEAN_OF', 'Mean of']
]);

export function getVerboseFormatText(roomFormat: RoomFormat, matchFormat: MatchFormat, setFormat: SetFormat, nSets: number, nSolves: number): string {
    if (roomFormat == 'CASUAL') {
        return "Enjoy endless solves in this casual room."
    } else {
        let formatText = "";
        if (nSets && nSets > 1) {
            switch(matchFormat) {
                case 'BEST_OF':
                    formatText += "Win the match by winning the most of " + nSets + " sets.";
                    break;
                case 'FIRST_TO':
                    formatText += "Win the match by being the first to win " + nSets + " sets.";
                    break;
                default:
                    break;
            }
            formatText += "\n";
        } 
        switch(setFormat) {
            case 'BEST_OF':
                formatText += "Win a set by winning the most of " + nSolves + " solves.";
                break;
            case 'FIRST_TO':
                formatText += "Win a set by being the first to win " + nSolves + " solves.";
                break;
            case 'AVERAGE_OF':
                formatText += "Win a set by having the best average of " + nSolves + " solves (best and worst times dropped).";
                break;
            case 'MEAN_OF':
                formatText += "Win a set by having the best mean of " + nSolves + " solves.";
                break;
        }
        return formatText;
    }
}

//all room states 
export const ROOM_STATES = [
    'WAITING', //like a pregame lobby - waiting for people before host starts
    'STARTED', //ingame - doing solves
    'FINSHED' //either when host ends the room, or when all attempts are done
]; 

export type RoomEvent = (typeof ROOM_EVENTS)[number];
export type RoomFormat = (typeof ROOM_FORMATS)[number];
export type MatchFormat = (typeof MATCH_FORMATS)[number];
export type SetFormat = (typeof SET_FORMATS)[number];
export type RoomState = (typeof ROOM_STATES)[number];

export interface IRoom {
    roomName: string;
    host: IUser;
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