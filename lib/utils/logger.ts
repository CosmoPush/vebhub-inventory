interface LogContext {
  [key: string]: unknown
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private readonly context: string
  private readonly logLevel: LogLevel

  constructor(context: string, logLevel: LogLevel = LogLevel.ERROR) {
    this.context = context
    this.logLevel = logLevel
  }

  debug(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.log("DEBUG", message, context)
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.log("INFO", message, context)
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.log("WARN", message, context)
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.ERROR) {
      this.log("ERROR", message, context)
    }
  }

  private log(level: string, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...(context && { data: context }),
    }

    if (level === "ERROR") {
      console.error(JSON.stringify(logEntry, null, 2))
    } else if (level === "WARN") {
      console.warn(JSON.stringify(logEntry, null, 2))
    } else {
      console.log(JSON.stringify(logEntry, null, 2))
    }
  }
}
