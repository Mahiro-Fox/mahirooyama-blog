interface LogContext {
  [key: string]: unknown;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      ...(error instanceof Error
        ? { errorMessage: error.message, stack: error.stack }
        : {}),
    };
    console.error(this.formatMessage('error', message, errorContext));
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}

export const logger = createLogger('App');
