import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class ExternalApiException extends BaseException {
  constructor(
    message: string,
    public readonly serviceName: string,
    context?: Record<string, any>,
  ) {
    super(message, HttpStatus.BAD_GATEWAY, { serviceName, ...context });
  }
}
