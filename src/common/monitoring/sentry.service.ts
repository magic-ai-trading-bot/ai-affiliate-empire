import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import '@sentry/tracing';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class SentryService implements OnModuleInit {
  private isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('SentryService');
  }

  onModuleInit() {
    const dsn = this.configService.get<string>('SENTRY_DSN');
    const environment =
      this.configService.get<string>('SENTRY_ENVIRONMENT') || 'production';
    const tracesSampleRate =
      parseFloat(
        this.configService.get<string>('SENTRY_TRACES_SAMPLE_RATE') || '0.1',
      ) || 0.1;

    this.isEnabled = !!dsn;

    if (!this.isEnabled) {
      this.logger.warn('Sentry DSN not configured - error tracking disabled');
      return;
    }

    Sentry.init({
      dsn,
      environment,
      tracesSampleRate,
      integrations: [
        Sentry.httpIntegration(),
        Sentry.fsIntegration(),
        Sentry.onUncaughtExceptionIntegration(),
        Sentry.onUnhandledRejectionIntegration(),
      ],
      beforeSend(event) {
        // Filter out sensitive data
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        return event;
      },
    });

    this.logger.log(
      `Sentry initialized - environment: ${environment}, sample rate: ${tracesSampleRate}`,
    );
  }

  captureException(
    error: Error,
    context?: {
      tags?: Record<string, string>;
      extra?: Record<string, any>;
      user?: { id?: string; email?: string; username?: string };
    },
  ): string | undefined {
    if (!this.isEnabled) {
      return undefined;
    }

    Sentry.withScope((scope) => {
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      if (context?.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      if (context?.user) {
        scope.setUser(context.user);
      }

      Sentry.captureException(error);
    });

    return undefined;
  }

  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: {
      tags?: Record<string, string>;
      extra?: Record<string, any>;
    },
  ): string | undefined {
    if (!this.isEnabled) {
      return undefined;
    }

    Sentry.withScope((scope) => {
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      if (context?.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      Sentry.captureMessage(message, level);
    });

    return undefined;
  }

  startTransaction(
    name: string,
    op?: string,
  ): { finish: () => void; setStatus: (status: string) => void } {
    if (!this.isEnabled) {
      return {
        finish: () => {},
        setStatus: () => {},
      };
    }

    const transaction = Sentry.startSpan(
      {
        name,
        op: op || 'task',
      },
      () => {
        return {
          finish: () => {},
          setStatus: () => {},
        };
      },
    );

    return transaction || { finish: () => {}, setStatus: () => {} };
  }

  addBreadcrumb(breadcrumb: {
    message: string;
    level?: Sentry.SeverityLevel;
    category?: string;
    data?: Record<string, any>;
  }): void {
    if (!this.isEnabled) {
      return;
    }

    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      level: breadcrumb.level || 'info',
      category: breadcrumb.category,
      data: breadcrumb.data,
      timestamp: Date.now() / 1000,
    });
  }

  setContext(name: string, context: Record<string, any>): void {
    if (!this.isEnabled) {
      return;
    }

    Sentry.setContext(name, context);
  }

  setUser(user: {
    id?: string;
    email?: string;
    username?: string;
  }): void {
    if (!this.isEnabled) {
      return;
    }

    Sentry.setUser(user);
  }

  setTag(key: string, value: string): void {
    if (!this.isEnabled) {
      return;
    }

    Sentry.setTag(key, value);
  }

  async close(timeout: number = 2000): Promise<boolean> {
    if (!this.isEnabled) {
      return true;
    }

    return Sentry.close(timeout);
  }

  async flush(timeout: number = 2000): Promise<boolean> {
    if (!this.isEnabled) {
      return true;
    }

    return Sentry.flush(timeout);
  }
}
