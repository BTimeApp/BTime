import { Schema, model } from 'mongoose';
import {IUser} from '@/types/user';

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true },
});

export const UserModel = model<IUser>('User', userSchema);