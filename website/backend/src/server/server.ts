import type { Request, Response } from "express";

import express from "express";
import { createServer } from "http";
import { connectToDB } from "@/database/database.js";
import {
  createSocket,
  setUpSocketMiddleware,
  SocketMiddleware,
  startSocketListener,
} from "@/socket/init-socket.js";
import { handleConfig } from "@/server/load-config.js";
import { createAuthRouter } from "@/auth/index.js";
import { api } from "@/api/index.js";
import passport from "passport";
import session from "express-session";
import { rateLimit } from "express-rate-limit";
import addDevExtras from "@/server/dev-extras.js";
import { connectToRedis } from "@/redis/init-redis.js";
import { createStores } from "@/redis/stores.js";
import { isProd } from "@/server/server-objects.js";
import { ServerLogger } from "@/logging/logger.js";
import { RoomWorker } from "@/rooms/room-worker.js";
import path from "path";

import { createProxyMiddleware } from "http-proxy-middleware";
import { IUser } from "@btime/types";

export async function startServer(): Promise<void> {
  // handle config with dotenv
  handleConfig();
  ServerLogger.info(`Running server with ${process.env.NODE_ENV} settings.`);

  // connect to the DB
  await connectToDB();

  // connect to Redis
  const { pubClient, subClient, dataClient } = await connectToRedis();

  const dataStores = await createStores(dataClient);

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

  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in environment");
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

  /**
   * HTTP logger is bloating the logs. Enable it here if we need it in the future
   */
  // const httpLogger = pinoHttp({
  //   logger: HttpLogger,

  //   genReqId: (req) => {
  //     return req.headers["x-request-id"] ?? randomUUID();
  //   },

  //   customLogLevel: (req, res, err) => {
  //     if (err || res.statusCode >= 500) return "error";
  //     if (res.statusCode >= 400) return "warn";

  //     // websocket
  //     if (req.headers.upgrade === "websocket") return "info";

  //     // Api requests
  //     if (req.url?.startsWith("/api")) return "info";

  //     // Everything else is noise by default
  //     return "debug";
  //   },

  //   customSuccessMessage: (req, res) =>
  //     `${req.method} ${req.url} -> ${res.statusCode}`,

  //   customErrorMessage: (req, res, err) =>
  //     `${req.method} ${req.url} -> ${res.statusCode} (${err.message})`,

  //   serializers: {
  //     req(req) {
  //       return {
  //         id: req.id,
  //         method: req.method,
  //         url: req.url,
  //         remoteAddress: req.remoteAddress,
  //       };
  //     },
  //     res(res) {
  //       return {
  //         statusCode: res.statusCode,
  //       };
  //     },
  //   },
  // });

  // app.use(httpLogger);
  app.use(sessionMiddleware);

  // allow passport to use session
  app.use(passport.initialize());
  app.use(passport.session());

  // Set up auth and logout routes
  app.use("/auth", createAuthRouter(passport, dataStores));
  app.get("/logout", (req, res, nextfn) => {
    const redirect = (req.query.redirect as string) || "/";

    // req.logout will automatically clear the req.user field before calling its callback, so store user id first.
    const userId = (req.user as IUser)?.userInfo.id;
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
    keyGenerator: (req) => {
      return String(
        req.ip ||
          req.headers["x-forwarded-for"] ||
          req.socket?.remoteAddress ||
          "unknown"
      );
    },
  });

  // Apply the rate limiting middleware to all requests.
  app.use(limiter);

  // Set up api routes
  app.use("/api", api(dataStores));

  /**
   * Create socket.io server instance and the Room Worker (for managing Room Processors to handle room event queues).
   * Circular dependency requires this order of operations
   */
  const io = createSocket(httpServer, pubClient, subClient);

  setUpSocketMiddleware(io, sessionMiddleware as SocketMiddleware);

  const roomWorker = new RoomWorker(dataClient, dataStores, io);

  startSocketListener(io, dataStores, roomWorker);

  if (!isProd) {
    // Dev: proxy all frontend requests to Vite dev server
    app.use(
      "/",
      createProxyMiddleware({
        target: "http://localhost:5173", // Vite dev server
        changeOrigin: true,
      })
    );
  } else {
    // Prod: serve prebuilt SPA from frontend/dist
    const frontendDist = path.join(__dirname, "..", "frontend", "dist");

    // Serve static files
    app.use(express.static(frontendDist));

    // Catch-all for SPA routing
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  }

  // Expose server to outside world
  if (!process.env.APP_PORT) {
    throw new Error("APP_PORT variable must be set in environment");
  }
  const PORT = parseInt(process.env.APP_PORT);
  httpServer.listen(PORT, "0.0.0.0", () => {
    ServerLogger.info(`Server listening on http://0.0.0.0:${PORT}`);
  });

  // Create test rooms
  if (!isProd) {
    await addDevExtras(dataStores, roomWorker);
  }
}
