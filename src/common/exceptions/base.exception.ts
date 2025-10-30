import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception class for custom errors
 */
export class BaseException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly context?: Record<string, any>,
  ) {
    super(
      {
        statusCode,
        message,
        context,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}
