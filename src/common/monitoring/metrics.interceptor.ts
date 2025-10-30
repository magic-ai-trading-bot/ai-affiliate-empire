import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - startTime) / 1000; // Convert to seconds
        const { method, route } = request;
        const status = response.statusCode;

        // Extract route path (remove query params and IDs)
        const routePath = this.extractRoutePath(route?.path || request.url);

        this.metricsService.recordHttpRequest(duration, {
          method,
          route: routePath,
          status,
        });
      }),
    );
  }

  private extractRoutePath(path: string): string {
    // Remove query parameters
    const pathWithoutQuery = path.split('?')[0];

    // Replace UUID/ID patterns with placeholders
    return pathWithoutQuery
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id');
  }
}
