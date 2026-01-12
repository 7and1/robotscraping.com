export interface LogContext {
  requestId?: string;
  apiKeyId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: LogContext;
  timestamp: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

class StructuredLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  log(
    level: LogEntry['level'],
    message: string,
    context?: LogContext,
    metadata?: Record<string, unknown>,
  ): void {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: Date.now(),
      metadata,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (level === 'error') {
      console.error('[ERROR]', message, { context, metadata });
    } else if (level === 'warn') {
      console.warn('[WARN]', message, { context, metadata });
    } else {
      console.log(`[${level.toUpperCase()}]`, message, { context, metadata });
    }
  }

  debug(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.log('debug', message, context, metadata);
  }

  info(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.log('info', message, context, metadata);
  }

  warn(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.log('warn', message, context, metadata);
  }

  error(
    message: string,
    error?: Error,
    context?: LogContext,
    metadata?: Record<string, unknown>,
  ): void {
    const entry: LogEntry = {
      level: 'error',
      message,
      context,
      timestamp: Date.now(),
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
      metadata,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console.error('[ERROR]', message, { error, context, metadata });
  }

  getLogs(level?: LogEntry['level']): LogEntry[] {
    if (level) {
      return this.logs.filter((log) => log.level === level);
    }
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }

  getLogsForExport(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new StructuredLogger();

export function createLogContext(request: Request, requestId?: string): LogContext {
  return {
    requestId,
    ip: request.headers.get('cf-connecting-ip') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    path: new URL(request.url).pathname,
    method: request.method,
  };
}
