interface LogContext {
  [key: string]: unknown;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 格式化日志消息
 */
function formatMessage(
  context: string,
  level: LogLevel,
  message: string,
  logContext?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const contextStr = logContext ? ` ${JSON.stringify(logContext)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}${contextStr}`;
}

/**
 * 创建一个带上下文的 Logger 实例（函数式）
 */
export function createLogger(context: string = 'App') {
  return {
    debug(message: string, logContext?: LogContext): void {
      if (process.env.NODE_ENV === 'development') {
        console.log(formatMessage(context, 'debug', message, logContext));
      }
    },

    info(message: string, logContext?: LogContext): void {
      console.log(formatMessage(context, 'info', message, logContext));
    },

    warn(message: string, logContext?: LogContext): void {
      console.warn(formatMessage(context, 'warn', message, logContext));
    },

    error(
      message: string,
      error?: Error | unknown,
      logContext?: LogContext
    ): void {
      const errorContext = {
        ...logContext,
        ...(error instanceof Error
          ? { errorMessage: error.message, stack: error.stack }
          : {}),
      };
      console.error(formatMessage(context, 'error', message, errorContext));
    },
  };
}

// 导出默认 Logger 实例
export const logger = createLogger('App');

// 导出 Logger 类型，方便其他地方引用
export type Logger = ReturnType<typeof createLogger>;
