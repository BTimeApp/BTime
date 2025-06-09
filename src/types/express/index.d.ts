import { IUser } from "@/types/user";

declare global {
  namespace Express {
    interface User extends IUser{
    }
  }
}

export {}; // force module scope
