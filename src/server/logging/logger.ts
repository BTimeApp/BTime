import pino from "pino";
import { isProd } from "@/server/server-objects";

//default to INFO in prod, DEBUG in dev. Override in env var.
const LOG_LEVEL = process.env.PINO_LOG_LEVEL ?? (isProd ? "info" : "debug");

const PROD_PINO_TRANSPORT_OPTIONS = {
  level: LOG_LEVEL,
  targets: [
    {
      target: "pino-file",
      options: {
        destination: 1, // stdout
      },
      level: LOG_LEVEL,
    },
    {
      target: "pino-roll",
      options: {
        file: "./logs/btime.log",
        frequency: "daily",
        mkdir: true,
        limit: { count: 7 },
      },
      level: LOG_LEVEL,
    },
  ],
};

const DEV_PINO_TRANSPORT_OPTIONS = {
  level: LOG_LEVEL,
  targets: [
    {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
    {
      target: "pino-roll",
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
  transport: isProd ? PROD_PINO_TRANSPORT_OPTIONS : DEV_PINO_TRANSPORT_OPTIONS,
});

/**
 * Singleton loggers
 */
export const RedisLogger = BTIME_LOGGER.child({ module: "redis" });
export const DBLogger = BTIME_LOGGER.child({ module: "database" });
export const AuthLogger = BTIME_LOGGER.child({ module: "auth" });

/**
 * Factories for dynamic context loggers
 */
export function createSocketLogger(socketId: string, userId?: string) {
  return BTIME_LOGGER.child({
    module: "socket",
    socketId,
    ...(userId && { userId }),
  });
}
