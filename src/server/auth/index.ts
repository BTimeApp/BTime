// import OAuth2Strategy from "passport-oauth2";
import { PassportStatic } from "passport";
import { UserModel, toIUser } from "@/server/models/user";
import { NextFunction, Request, Response, Router } from "express";
import { createWCAAuth } from "@/server/auth/wca";  

export function createAuthRouter(
  passport: PassportStatic
) {

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.userInfo.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    //id is the objectId of the user in DB.
    UserModel.findOne({ _id: id })
      .then((user) => {
        // find fail
        if (!user) {
          return done(null, false);
        }

        return done(null, toIUser(user) as Express.User);
      })
      .catch((err) => {
        return done(err);
      });
  });

  const router = Router();
  router.use("/wca", createWCAAuth(passport));
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
