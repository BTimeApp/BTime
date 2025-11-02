import { IUserInfo } from "@/types/user";
import { SolveStatus } from "@/types/status";
import { IResult } from "@/types/result";
import { ITeam } from "@/types/team";

export interface IRoomParticipant {
  points: number; //this is the variable that holds point value within a set. it can be solves won, average of solves done so far, mean of solves so far
  setWins: number; //set wins
  solveStatus: SolveStatus;
  currentResult?: IResult; //this should only ever hold a result for the CURRENT solve (duplicate data)
}

export interface IRoomUser extends IRoomParticipant {
  user: IUserInfo;
  joinedAt: Date;
  banned: boolean; //true = banned
  active: boolean; //true = in room, false = not in room
  competing: boolean; //false = spectating
}

export interface IRoomTeam extends IRoomParticipant {
  team: ITeam;
}
