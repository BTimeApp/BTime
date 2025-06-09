import express, { Request, Response } from "express";
import { createServer } from "http";
import next from "next";
import { connectToDB } from "@/server/database/database";
import {
  IRoom
} from "@/types/room";
import { IUser } from "@/types/user";
import { initSocket } from "./socket/init_socket";
import { handleConfig } from "./load_config";
import { configureWCAPassport } from "@/server/auth";
import { api } from "@/server/api";
import passport from 'passport';
import session from 'express-session';

export const rooms: Map<string, IRoom> = new Map<string, IRoom>(); // In-memory room store
export const users: Map<string, IUser> = new Map<string, IUser>(); // In-memory user store

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
      // authentication successful - TODO make this redirect to previous page (or other custom logic)
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
