import express, { Request, Response } from "express";
import { createServer } from "http";
import next from "next";
import { connectToDB } from "@/server/database/database";
import {
  IRoom
} from "@/types/room";
import { Types } from "mongoose";
import { IUser } from "@/types/user";
import { initSocket } from "./socket/init_socket";
import { handleConfig } from "./load_config";
import { configureWCAPassport, UserProfile } from "@/server/auth";
import { api } from "@/server/api";
import passport from 'passport';
import session from 'express-session';


export const rooms: Map<Types.ObjectId, IRoom> = new Map<Types.ObjectId, IRoom>(); // In-memory room store
export const users: Map<Types.ObjectId, IUser> = new Map<Types.ObjectId, IUser>(); // In-memory user store

export async function startServer(): Promise<void> {
  // handle config with dotenv
  handleConfig();
  const isProd = (process.env.NODE_ENV === "production");

  // connect to the DB
  await connectToDB();

  // start next.js app (used to serve frontend)
  const nextApp = next({ dev: !isProd });
  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();

  // create express app, http server
  const app = express();
  const httpServer = createServer(app);

  // configure express app, add middleware
  app.set('prod', isProd);
  app.use(express.json()); // for parsing application/json
  app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
  
  // set up session
  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProd
      }
    })
  );

  // allow passport to use session
  app.use(passport.initialize())
  app.use(passport.session())

  configureWCAPassport(passport);

  //TODO - move auth routes to their own file
  app.get('/auth/wca', passport.authenticate('wca', { scope: ['public', 'email'] }));

  app.get(
    '/auth/wca/callback',
    passport.authenticate('wca', { failureRedirect: '/' }),
    (req, res) => {
      // authentication successful
      console.log(`User with WCAID ${(req.user as UserProfile).wca_id} is now logged in.`);

      res.redirect('/');
    }
  );

  // Set up api routes
  app.use('/api', api(app, passport));

  // set up socket.io server listener
  initSocket(httpServer);


  // Let Next.js handle all other requests
  app.use((req: Request, res: Response) => {
    return handle(req, res);
  });

  // Expose server to outside world
  const PORT = parseInt(process.env.APP_PORT);
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`> Server listening on http://0.0.0.0:${PORT}`);
  });
}
