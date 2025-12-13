/**
 * Log levels, following Pino's log levels (and with an option for no logging)
 */
export type LogLevel =
  | "none"
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "fatal";

export function isPinoLogLevel(
  level: LogLevel
): level is Exclude<LogLevel, "none"> {
  return level !== "none";
}
