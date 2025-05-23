import { Document, Types } from "mongoose";


export const PENALTIES = ['ok', '+2', 'DNF'];
export type Penalty = (typeof PENALTIES)[number];


export interface IResult {
    time: number,
    penalty: Penalty,
}

export interface ISolve extends Document {
    id: number,
    scramble: string,
    results: Record<string, IResult>, //user ID : result
};