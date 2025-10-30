import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SentryService } from './sentry.service';
import { LoggerService } from '../logging/logger.service';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly sentryService: SentryService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('SentryExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Capture exception in Sentry
    if (exception instanceof Error) {
      this.sentryService.captureException(exception, {
        tags: {
          path: request.url,
          method: request.method,
          status: status.toString(),
        },
        extra: {
          body: request.body,
          query: request.query,
          params: request.params,
        },
      });
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'string' ? message : (message as any).message,
    });
  }
}
