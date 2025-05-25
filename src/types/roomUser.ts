import { Types } from 'mongoose';
import { IUser } from '@/types/user';

export interface IRoomUser {
  user: Types.ObjectId | IUser;
  points: number;
  setWins: number;
  joinedAt: Date;
  competing: boolean; //false = spectating
}