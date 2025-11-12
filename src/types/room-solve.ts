import { ISolve } from "@/types/solve";

export interface IRoomSolve {
  solve: ISolve;
  setIndex: number; //the set number that this solve belongs to
  solveIndex: number; //the solve number that this solve belongs to
  solveWinners: string[]; //user ID
  setWinners: string[]; //multiple winner is possible but unlikely
  matchWinners: string[];
  finished: boolean;
}
