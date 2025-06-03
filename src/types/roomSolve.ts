import { ISolve } from "./solve";

export interface IRoomSolve {
  solve: ISolve;
  setIndex: number; //the set number that this solve belongs to
  solveIndex: number; //the solve number that this solve belongs to
}
