import { ISolve } from "@/types/solve";

export interface IRoomSolve {
  solve: ISolve;
  index: number; //the solve index WITHIN set
  winners: string[];
  finished: boolean;
}

export interface IRoomSet {
  solves: IRoomSolve[],
  index: number; //the set index
  winners: string[];
  finished: boolean;
}

export interface IRoomMatch {
  sets: IRoomSet[];
  winners: string[];
  finished: boolean;
}