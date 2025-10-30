import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class VideoGenerationException extends BaseException {
  constructor(message: string, context?: Record<string, any>) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, context);
  }
}
