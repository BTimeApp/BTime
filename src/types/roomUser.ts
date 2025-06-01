import { IUser } from '@/types/user';
import { SolveStatus } from './status';

export interface IRoomUser {
  user: IUser;
  points: number;
  setWins: number;
  joinedAt: Date;
  competing: boolean; //false = spectating
  userStatus: SolveStatus;
}