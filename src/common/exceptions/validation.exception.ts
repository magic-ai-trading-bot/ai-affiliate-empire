import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class ValidationException extends BaseException {
  constructor(message: string, context?: Record<string, any>) {
    super(message, HttpStatus.BAD_REQUEST, context);
  }
}
