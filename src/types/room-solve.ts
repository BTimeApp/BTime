import { ISolve } from "@/types/solve";

// export interface IRoomSolve {
//   solve: ISolve;
//   setIndex: number; //the set number that this solve belongs to
//   solveIndex: number; //the solve number that this solve belongs to
//   solveWinners: string[]; //user ID
//   setWinners: string[]; //multiple winner is possible but unlikely
//   matchWinners: string[];
//   finished: boolean;
// }


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