// import OAuth2Strategy from "passport-oauth2";

import type { RedisStores } from "@/redis/stores.js";
import type { NextFunction, Request, Response} from "express";
import type { PassportStatic } from "passport";

import { createWCAAuth } from "@/auth/wca.js";
import { toIUser } from "@/models/user.js";
import { Router } from "express";
import { db } from "@/database/database.js";
import { users } from "@/database/schema.js";
import { eq } from "drizzle-orm";

export function createAuthRouter(
  passport: PassportStatic,
  stores: RedisStores
) {
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.userInfo.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, parseInt(id))
      });
      if (!user) {
        return done(null, false);
      }
      return done(null, toIUser(user) as Express.User);
    } catch (err) {
      return done(err);
    }
  });

  const router = Router();
  router.use("/wca", createWCAAuth(passport, stores));
  //TOOD - add more login routes as needed

  return router;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.isAuthenticated()) {
    res
      .status(401)
      .json({ error: "Not authenticated. User needs to be logged in" });
    return;
  }
  next();
}
