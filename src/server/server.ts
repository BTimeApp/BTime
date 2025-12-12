import express, { Request, Response } from "express";
import { createServer } from "http";
import next from "next";
import { connectToDB } from "@/server/database/database";
import { initSocket, SocketMiddleware } from "@/server/socket/init-socket";
import { handleConfig } from "@/server/load-config";
import { createAuthRouter } from "@/server/auth";
import { api } from "@/server/api";
import passport from "passport";
import session from "express-session";
import { rateLimit } from "express-rate-limit";
import addDevExtras from "@/server/dev-extras";
import { connectToRedis } from "@/server/redis/init-redis";
import { createStores } from "@/server/redis/stores";
import { isProd } from "@/server/server-objects";

export async function startServer(): Promise<void> {
  // handle config with dotenv
  handleConfig();
  console.log(`Running server with ${process.env.NODE_ENV} settings.`);

  // connect to the DB
  await connectToDB();

  // connect to Redis
  const { pubClient, subClient, dataClient } = await connectToRedis();

  const dataStores = await createStores(dataClient);

  // start next.js app (used to serve frontend)
  const nextApp = next({ dev: !isProd });
  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();

  // create express app, http server
  const app = express();
  const httpServer = createServer(app);

  // configure express app, add middleware
  app.set("prod", isProd);
  app.use(express.json()); // for parsing application/json
  app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
  if (isProd) {
    app.set("trust proxy", 1);
  }

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
    },
  });

  app.use(sessionMiddleware);

  // allow passport to use session
  app.use(passport.initialize());
  app.use(passport.session());

  // Set up auth and logout routes
  app.use("/auth", createAuthRouter(passport, dataStores));
  app.get("/logout", (req, res, nextfn) => {
    const redirect = (req.query.redirect as string) || "/";

    // req.logout will automatically clear the req.user field before calling its callback, so store user id first.
    const userId = req.user?.userInfo.id;
    req.logout?.((err) => {
      if (err) {
        res.status(500).send("Logout failed");
        res.redirect(redirect);
        return nextfn(err);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req.session?.destroy((err: any) => {
        if (err) {
          res.status(500).send("Logout failed");
          res.redirect(redirect);
          return nextfn(err);
        }

        //clear the cookie that defines the session
        res.clearCookie("connect.sid", {
          path: "/",
          httpOnly: true,
          secure: isProd,
        });

        //remove the user from global user pool
        if (userId) {
          dataStores.users.deleteUser(userId);
        }

        res.redirect(redirect);
      });
    });
  });

  /**
   * Rate Limiter
   */
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 1000, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    // store: ... , // Redis, Memcached, etc.
  });

  // Apply the rate limiting middleware to all requests.
  app.use(limiter);

  // Set up api routes
  app.use("/api", api(dataStores));

  // set up socket.io server listener
  initSocket(
    httpServer,
    sessionMiddleware as SocketMiddleware,
    pubClient,
    subClient,
    dataStores
  );

  // Let Next.js handle all other requests
  app.use((req: Request, res: Response) => {
    return handle(req, res);
  });

  // Expose server to outside world
  const PORT = parseInt(process.env.APP_PORT);
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`> Server listening on http://0.0.0.0:${PORT}`);
  });

  // Create test rooms
  if (!isProd) {
    await addDevExtras(dataStores);
  }
}
