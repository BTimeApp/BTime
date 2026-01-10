export const PENALTIES = ["OK", "+2", "DNF"];

export type Penalty = (typeof PENALTIES)[number];

export interface IResult {
  time: number; //centiseconds
  penalty: Penalty;
}
