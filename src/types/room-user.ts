import { IUser } from '@/types/user';
import { SolveStatus } from '@/types/status';
import { IResult } from '@/types/result';

export interface IRoomUser {
  user: IUser;
  points: number;
  setWins: number;
  joinedAt: Date;
  competing: boolean; //false = spectating
  userStatus: SolveStatus;
  currentResult?: IResult; //this should only ever hold a result for the CURRENT solve (duplicate data)
}