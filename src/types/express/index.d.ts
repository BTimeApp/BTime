import { IUser } from "@/types/user";
import 'express-session';

declare global {
  namespace Express { 
    interface User extends IUser{ // eslint-disable-line @typescript-eslint/no-empty-object-type
    }
  }
}

declare module 'http' {
  interface IncomingMessage {
    user?: IUser;
  }
}

declare module 'express-session' {
  interface SessionData {
    redirectTo?: string;
  }
}
export {}; // force module scope
