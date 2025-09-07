import { IUserInfo } from "@/types/user";
import { SolveStatus } from "@/types/status";
import { IResult } from "@/types/result";

export interface IRoomUser {
  user: IUserInfo;
  points: number; //this is the variable that holds point value within a set. it can be solves won, average of solves done so far, mean of solves so far
  setWins: number;
  joinedAt: Date;
  active: boolean; //true = in room, false = not in room
  competing: boolean; //false = spectating
  userStatus: SolveStatus;
  currentResult?: IResult; //this should only ever hold a result for the CURRENT solve (duplicate data)
}
