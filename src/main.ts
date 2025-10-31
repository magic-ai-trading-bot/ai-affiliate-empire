import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggerService } from './common/logging/logger.service';
import { SentryService } from './common/monitoring/sentry.service';
import { SentryInterceptor } from './common/monitoring/sentry.interceptor';
import { SentryExceptionFilter } from './common/monitoring/sentry.filter';
import { MetricsInterceptor } from './common/monitoring/metrics.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Use custom logger
  const logger = app.get(LoggerService);
  app.useLogger(logger);
  logger.setContext('Bootstrap');

  // Get monitoring services
  const sentryService = app.get(SentryService);
  const metricsService = app.get('MetricsService');

  // Global interceptors
  app.useGlobalInterceptors(
    new SentryInterceptor(sentryService),
    new MetricsInterceptor(metricsService),
  );

  // Global exception filter
  app.useGlobalFilters(new SentryExceptionFilter(sentryService, logger));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration - use specific origins
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('AI Affiliate Empire API')
    .setDescription('Autonomous AI-powered affiliate marketing system')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key for programmatic access',
      },
      'API-Key',
    )
    .addTag('auth', 'Authentication and authorization')
    .addTag('products', 'Product discovery and ranking')
    .addTag('content', 'Content generation')
    .addTag('videos', 'Video generation')
    .addTag('publisher', 'Multi-platform publishing')
    .addTag('analytics', 'Analytics and metrics')
    .addTag('optimizer', 'System optimization')
    .addTag('health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 AI Affiliate Empire API running on: http://localhost:${port}`);
  logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
  logger.log(`🏥 Health check available at: http://localhost:${port}/health`);
  logger.log(`📊 Metrics available at: http://localhost:${port}/metrics`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`CORS origins: ${corsOrigins.join(', ')}`);

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.warn(`${signal} received, shutting down gracefully...`);

    // Flush Sentry events
    try {
      await sentryService.flush(2000);
      logger.log('Sentry events flushed');
    } catch (error) {
      logger.error('Error flushing Sentry events', error);
    }

    await app.close();
    logger.log('Application closed');
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
