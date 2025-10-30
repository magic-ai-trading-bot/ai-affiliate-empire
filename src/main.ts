import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from './common/logging/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use custom logger
  const logger = app.get(LoggerService);
  app.useLogger(logger);
  logger.setContext('Bootstrap');

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
    .addBearerAuth()
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
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`CORS origins: ${corsOrigins.join(', ')}`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.warn('SIGTERM received, shutting down gracefully...');
    await app.close();
    logger.log('Application closed');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.warn('SIGINT received, shutting down gracefully...');
    await app.close();
    logger.log('Application closed');
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
