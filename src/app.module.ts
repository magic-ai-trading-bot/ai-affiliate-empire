import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './common/database/database.module';
import { LoggerModule } from './common/logging/logger.module';
import { EncryptionModule } from './common/encryption/encryption.module';
import { CircuitBreakerModule } from './common/circuit-breaker/circuit-breaker.module';
import { MonitoringModule } from './common/monitoring/monitoring.module';
import { HealthModule } from './common/health/health.module';
import { SecretsManagerModule } from './common/secrets/secrets-manager.module';
import { AuthModule } from './common/auth/auth.module';
import { JwtAuthGuard } from './common/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/auth/guards/roles.guard';
import { validationSchema } from './common/config/env.validation';
import { ProductModule } from './modules/product/product.module';
import { ContentModule } from './modules/content/content.module';
import { VideoModule } from './modules/video/video.module';
import { PublisherModule } from './modules/publisher/publisher.module';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { OptimizerModule } from './modules/optimizer/optimizer.module';
import { ReportsModule } from './modules/reports/reports.module';
import { GdprModule } from './modules/gdpr/gdpr.module';
import { CostTrackingModule } from './modules/cost-tracking/cost-tracking.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema,
      validationOptions: {
        abortEarly: false, // Show all validation errors
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000,
        limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      },
    ]),
    LoggerModule,
    MonitoringModule,
    EncryptionModule,
    CircuitBreakerModule,
    HealthModule,
    SecretsManagerModule,
    AuthModule,
    DatabaseModule,
    ProductModule,
    ContentModule,
    VideoModule,
    PublisherModule,
    OrchestratorModule,
    AnalyticsModule,
    OptimizerModule,
    ReportsModule,
    GdprModule,
    CostTrackingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
