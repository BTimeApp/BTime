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
  | "fatal"
  | "dev"; // used only in dev. Don't ship any dev logs to prod

export function isPinoLogLevel(
  level: LogLevel
): level is Exclude<LogLevel, "none"> {
  return level !== "none";
}
