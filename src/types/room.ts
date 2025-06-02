import { IUser } from '@/types/user';
import { IRoomUser } from '@/types/roomUser';
import { ISolve } from '@/types/solve';
import { Result } from './result';
import { Types } from 'mongoose';

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
    _id: Types.ObjectId,
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
    state: RoomState;
    password?: string;
    winners?: string[]; //the objectIds (users) who have won the whole room
};

/**
 * check if there is a set winner. return all set winner(s), although it should be rare to have multiple.
*/ 
export function findSetWinners(room: IRoom): string[] {
    //no set wins when room is a casual room
    if (room.roomFormat == "CASUAL") return [];
    const competingUsers = Object.values(room.users).filter((user) => user.competing);
    //no set win possible if no competing users exist
    if (competingUsers.length == 0) return [];

    switch(room.setFormat) { 
        case "BEST_OF":
            //user has won for sure if they have the majority of solves
            return competingUsers.filter(user => user.points > room.nSolves! / 2).map((user, index) => {return user.user._id.toString()});
        case "FIRST_TO":
            //user has won only when they win n solves.
            return competingUsers.filter(user => user.points >= room.nSolves!).map((user, index) => {return user.user._id.toString()});
        case "AVERAGE_OF": {
            //requires that competing user have done ALL solves in this set
            const setSolves = room.solves[room.currentSet - 1];
            if (setSolves.length < (room.nSolves || Number.POSITIVE_INFINITY)) return [];

            let currentIds = new Set(competingUsers.map((user, index) => {return user.user._id.toString()}));
            for (const solve of setSolves) {
                let competedIds = new Set(Object.keys(solve.results));
                currentIds = currentIds.intersection(competedIds);
            }
            const eligibleIds = [...currentIds];

            if (eligibleIds.length == 0) return [];

            const results: Record<string, Result[]> = eligibleIds.reduce((acc, id) => {
                acc[id] = setSolves.map(solve => Result.fromIResult(solve.results[id]));
                return acc;
              }, {} as Record<string, Result[]>);

            const averages: Record<string, number> = Object.fromEntries(
                eligibleIds.map((id, index) => [id, Result.averageOf(results[id])]
            ));

            const minAverage = Math.min(...Object.values(averages));

            return eligibleIds.filter((uid) => averages[uid] === minAverage);
        }
        case "MEAN_OF": {
            //requires that competing user have done ALL solves in this set
            const setSolves = room.solves[room.currentSet - 1];
            if (setSolves.length < (room.nSolves || Number.POSITIVE_INFINITY)) return [];

            let currentIds = new Set(competingUsers.map((user, index) => {return user.user._id.toString()}));
            for (const solve of setSolves) {
                let competedIds = new Set(Object.keys(solve.results));
                currentIds = currentIds.intersection(competedIds);
            }
            const eligibleIds = [...currentIds];

            if (eligibleIds.length == 0) return [];

            const results: Record<string, Result[]> = eligibleIds.reduce((acc, id) => {
                acc[id] = setSolves.map(solve => Result.fromIResult(solve.results[id]));
                return acc;
              }, {} as Record<string, Result[]>);

            const means: Record<string, number> = Object.fromEntries(
                eligibleIds.map((id, index) => [id, Result.meanOf(results[id])]
            ));

            const minMean = Math.min(...Object.values(means));

            return eligibleIds.filter((uid) => means[uid] === minMean);
        }
        default:
            return [];
    }
}

/**
 * check if there is a match winner. return all match winner(s), although it should be rare to have multiple.
*/ 
export function findMatchWinners(room: IRoom): string[] {
    //no set wins when room is a casual room
    if (room.roomFormat == "CASUAL") return [];
    const competingUsers = Object.values(room.users).filter((user) => user.competing);
    //no set win possible if no competing users exist
    if (competingUsers.length == 0) return [];

    switch(room.setFormat) { 
        case "BEST_OF":
            //user has won for sure if they have the majority of solves
            return competingUsers.filter(user => user.setWins > room.nSets! / 2).map((user, index) => {return user.user._id.toString()});
        case "FIRST_TO":
            //user has won only when they win n solves.
            return competingUsers.filter(user => user.setWins >= room.nSets!).map((user, index) => {return user.user._id.toString()});
        default:
            return [];
    }
}

