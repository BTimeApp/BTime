import { IResult } from "@/types/result";

export type IAttempt = | {
  scramble: string;
  finished: false;
} | {
  scramble: string;
  finished: true;
  result: IResult;
}


export interface ISolve {
  id: number;
  scrambles: string[]; //all scrambles generated for this attempt. note that the number of scrambles per solve may fluctuate depending on teams, but we should always generate at least one.
  attempts: Record<string, IAttempt>; //user ID : attempt
  results: Record<string, IResult>; //user or team ID : result - only store the correct one depending on teams enabled
}