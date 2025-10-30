import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;

  constructor(private context?: string) {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const environment = process.env.NODE_ENV || 'development';

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, context, correlationId, ...meta }) => {
        const logContext = context || this.context || 'Application';
        const correlationIdStr = correlationId ? ` [${correlationId}]` : '';
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level.toUpperCase()}]${correlationIdStr} [${logContext}] ${message}${metaStr}`;
      }),
    );

    // Console transport for development
    const consoleTransport = new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat,
      ),
    });

    // File transports with rotation
    const errorFileTransport = new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    });

    const combinedFileTransport = new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    });

    // Create logger instance
    this.logger = winston.createLogger({
      level: logLevel,
      transports:
        environment === 'production'
          ? [errorFileTransport, combinedFileTransport, consoleTransport]
          : [consoleTransport],
    });
  }

  /**
   * Set context for logger instance
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Log informational message
   */
  log(message: string, context?: string, meta?: Record<string, any>): void {
    this.logger.info(message, { context: context || this.context, ...meta });
  }

  /**
   * Log error message with optional stack trace
   */
  error(message: string, trace?: string, context?: string, meta?: Record<string, any>): void {
    this.logger.error(message, {
      context: context || this.context,
      stack: trace,
      ...meta,
    });
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: string, meta?: Record<string, any>): void {
    this.logger.warn(message, { context: context || this.context, ...meta });
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: string, meta?: Record<string, any>): void {
    this.logger.debug(message, { context: context || this.context, ...meta });
  }

  /**
   * Log verbose message
   */
  verbose(message: string, context?: string, meta?: Record<string, any>): void {
    this.logger.verbose(message, { context: context || this.context, ...meta });
  }

  /**
   * Get winston logger instance for advanced usage
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}
