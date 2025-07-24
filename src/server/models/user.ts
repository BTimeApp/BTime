import { Schema, Document, model, ObjectId } from "mongoose";
import { IUser } from "@/types/user";

export interface UserDocument extends Document {
  name: string;
  email: string;
  userName: string;
  wcaId?: string;
  wcaIdNo?: number;
  avatarURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    userName: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 25,
      match: /^[a-zA-Z0-9_.]+$/, // Only alphanumeric + underscore,
      unique: true,
    }, 
    email: { type: String, required: true },
    wcaId: { type: String, required: false },
    wcaIdNo: { type: Number, required: false }, //the ID number stored in WCA databases. Used during WCA OAuth login
    avatarURL: { type: String, required: false },
    //Must include createdAt and updatedAt even if specifying timestamps:true when using methods/virtuals/statics -- https://mongoosejs.com/docs/typescript/schemas.html
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  {
    timestamps: true, //creates updatedAt field
  }
);

export const UserModel = model<UserDocument>("User", userSchema, "Users");

/** Converts a UserDocument to IUser for use in the backend.
 *
 */
export function toIUser(user: UserDocument): IUser {
  return {
    id: (user._id as ObjectId).toString(),
    name: user.name,
    email: user.email,
    userName: user.userName,
    wcaId: user.wcaId,
    avatarURL: user.avatarURL,
  };
}
