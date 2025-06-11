import { IUser } from "@/types/user";
import { IncomingMessage } from "http";

declare global {
  namespace Express {
    interface User extends IUser{
    }
  }
}

declare module 'http' {
  interface IncomingMessage extends IncomingMessage {
    user?: IUser;
  }
}
export {}; // force module scope
