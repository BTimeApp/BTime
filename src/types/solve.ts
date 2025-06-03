import { IResult } from "@/types/result";

export interface ISolve {
  id: number;
  scramble: string;
  results: Record<string, IResult>; //user ID : result
}
