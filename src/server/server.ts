import express, { Request, Response } from "express";
import { createServer } from "http";
import next from "next";
import { connectToDB } from "@/server/database/database";
import { initSocket, SocketMiddleware } from "@/server/socket/init_socket";
import { handleConfig } from "@/server/load_config";
import { createAuthRouter } from "@/server/auth";
import { api } from "@/server/api";
import passport from 'passport';
import session from 'express-session';

import {users} from "@/server/server_objects";

export async function startServer(): Promise<void> {
  // handle config with dotenv
  handleConfig();
  console.log(`Running server with ${process.env.NODE_ENV} settings.`)
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
  const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 7, //1 week in milliseconds
    }
  })

  app.use(sessionMiddleware);

  // allow passport to use session
  app.use(passport.initialize())
  app.use(passport.session())

  // Set up auth and logout routes
  app.use("/auth", createAuthRouter(passport));
  app.get('/logout', (req, res, nextfn) => {
    const redirect = req.query.redirect as string || '/';
  
    // req.logout will automatically clear the req.user field before calling its callback, so store user id first.
    const userId = req.user?.id;
    req.logout?.(err => {
      if (err) {
        res.status(500).send('Logout failed');
        res.redirect(redirect);
        return nextfn(err);
      }

      req.session?.destroy((err: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any

        if (err) {
          res.status(500).send('Logout failed');
          res.redirect(redirect);
          return nextfn(err);
        }

        //clear the cookie that defines the session
        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: isProd,
        });

        //remove the user from global user pool
        if (userId) {
          users.delete(userId);
        }

        res.redirect(redirect);
      });
    });
  });
  
  // Set up api routes
  app.use('/api', api());

  // set up socket.io server listener
  initSocket(httpServer, sessionMiddleware as SocketMiddleware);


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
