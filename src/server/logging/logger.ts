import pino from "pino";
import { isProd } from "@/server/server-objects";
import { IUser } from "@/types/user";

//default to INFO in prod, DEBUG in dev. Override in env var.
const LOG_LEVEL = process.env.PINO_LOG_LEVEL ?? (isProd ? "info" : "debug");

const PROD_PINO_TRANSPORT_OPTIONS = {
  targets: [
    {
      target: "pino-file",
      level: LOG_LEVEL,
      options: {
        destination: 1, // stdout
      },
    },
    {
      target: "pino-roll",
      level: LOG_LEVEL,
      options: {
        file: "./logs/btime.log",
        frequency: "daily",
        mkdir: true,
        limit: { count: 7 },
      },
    },
  ],
};

const DEV_PINO_TRANSPORT_OPTIONS = {
  targets: [
    {
      target: "pino-pretty",
      level: LOG_LEVEL,
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname", //ignore pid, hostname in dev since everything is local
      },
    },
    {
      target: "pino-roll",
      level: LOG_LEVEL,
      ignore: "pid,hostname", //ignore pid, hostname in dev since everything is local
      options: {
        file: "./logs/btime.log",
        frequency: "daily",
        mkdir: true,
        limit: { count: 1 },
      },
    },
  ],
};

/**
 * The main logger instance. Never use this directly in other files!
 * Should always use a child, either one of the singletons exported below
 * or created through a factory function (when context isn't static)
 */
const BTIME_LOGGER = pino({
  level: LOG_LEVEL,
  transport: isProd ? PROD_PINO_TRANSPORT_OPTIONS : DEV_PINO_TRANSPORT_OPTIONS,
});

/**
 * Singleton loggers
 */
// for general events in the backend - e.g. start
export const ServerLogger = BTIME_LOGGER.child({ module: "server" });

// for redis
export const RedisLogger = BTIME_LOGGER.child({ module: "redis" });

// for mongodb
export const DBLogger = BTIME_LOGGER.child({ module: "database" });

// for auth
export const AuthLogger = BTIME_LOGGER.child({ module: "auth" });

// for http
export const HttpLogger = BTIME_LOGGER.child({ module: "http" });

/**
 * Factories for dynamic context loggers
 */
export function createSocketLogger(socketId: string, user: IUser | undefined) {
  return BTIME_LOGGER.child({
    module: "socket",
    socketId,
    user: user
      ? {
          userId: user.userInfo.id,
          userName: user.userInfo.userName,
        }
      : null,
  });
}
