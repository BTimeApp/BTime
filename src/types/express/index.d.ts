import { IUser } from "@/types/user";
import "express-session";

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends IUser {}
  }
}

declare module "http" {
  interface IncomingMessage {
    user?: IUser;
  }
}

declare module "express-session" {
  interface SessionData {
    redirectTo?: string;
  }
}
export {}; // force module scope
