import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { SentryService } from './sentry.service';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  constructor(private readonly sentryService: SentryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;

    const transaction = this.sentryService.startTransaction(
      `${method} ${url}`,
      'http.server',
    );

    this.sentryService.setContext('http', {
      method,
      url,
      ip,
      userAgent: headers['user-agent'],
    });

    return next.handle().pipe(
      tap(() => {
        transaction.setStatus('ok');
        transaction.finish();
      }),
      catchError((error) => {
        transaction.setStatus('internal_error');
        transaction.finish();
        throw error;
      }),
    );
  }
}
