import express, { Request, Response } from "express";
import { createServer } from "http";
import next from "next";
import { connectToDB } from "@/server/database/database";
import { initSocket, SocketMiddleware } from "./socket/init_socket";
import { handleConfig } from "./load_config";
import { configureWCAPassport } from "@/server/auth";
import { api } from "@/server/api";
import passport from 'passport';
import session from 'express-session';

import {rooms, users} from "@/server/server_objects";

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
  const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 7, //1 week in milliseconds
    }
  })

  app.use(sessionMiddleware);

  // allow passport to use session
  app.use(passport.initialize())
  app.use(passport.session())

  configureWCAPassport(passport);

  //TODO - move auth routes to their own file
  app.get('/auth/wca', (req, res, nextfn) => {
    const redirect = req.query.redirect as string || "/";
    if (redirect.startsWith('/') && !redirect.startsWith('//')) {
      
      const stateObj = {
        redirectTo: redirect,
        source: 'login-button',
      };
  
      const stateStr = encodeURIComponent(JSON.stringify(stateObj));

      passport.authenticate('wca', {
        scope: ['public', 'email'],
        state: stateStr
      })(req, res, nextfn);
    } else {
      passport.authenticate('wca', {
        scope: ['public', 'email']
      })(req, res, nextfn);
    }
  });

  app.get(
    '/auth/wca/callback',
    passport.authenticate('wca', {failureRedirect: "/profile", session: true,}),
    (req, res) => {
      let redirectTo = "/";

      try {
        if (req.query.state) {
          const state = JSON.parse(decodeURIComponent(req.query.state as string));
          if (state.redirectTo && typeof state.redirectTo === 'string') {
            redirectTo = state.redirectTo;
          }
        }
      } catch (e) {
        console.warn('Invalid state param:', e);
      }

      // authentication successful - TODO make this redirect to previous page (or other custom logic)
      const user = req.user;
      
      if (!user) {
        //this one should never happen...
        console.log("No User in auth wca callback...");
      } else if (users.get(user.id)) {
        //already exists in users... 
        console.log(`User ${user.id} double login.`);
      } else {
        users.set(user.id, user);
      }
      
      res.redirect(redirectTo);
    }
  );

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

      req.session?.destroy((err: any) => {

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
  app.use('/api', api(app, passport));

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
