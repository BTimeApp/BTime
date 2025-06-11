import { IUser } from "@/types/user";
import { IncomingMessage } from "http";
import 'express-session';

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

declare module 'express-session' {
  interface SessionData {
    redirectTo?: string;
  }
}
export {}; // force module scope
