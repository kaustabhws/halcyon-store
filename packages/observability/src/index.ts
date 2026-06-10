export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

class ConsoleLogger implements Logger {
  constructor(private readonly bindings: Record<string, unknown> = {}) {}
  private emit(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
    const entry = {
      level,
      msg,
      ts: new Date().toISOString(),
      ...this.bindings,
      ...(meta ?? {}),
    };
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](JSON.stringify(entry));
  }
  debug(msg: string, meta?: Record<string, unknown>) { this.emit("debug", msg, meta); }
  info(msg: string, meta?: Record<string, unknown>) { this.emit("info", msg, meta); }
  warn(msg: string, meta?: Record<string, unknown>) { this.emit("warn", msg, meta); }
  error(msg: string, meta?: Record<string, unknown>) { this.emit("error", msg, meta); }
  child(bindings: Record<string, unknown>): Logger {
    return new ConsoleLogger({ ...this.bindings, ...bindings });
  }
}

export function createLogger(bindings: Record<string, unknown> = {}): Logger {
  return new ConsoleLogger(bindings);
}
