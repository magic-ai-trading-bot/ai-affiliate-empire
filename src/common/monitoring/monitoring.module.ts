import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SentryService } from './sentry.service';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { LoggerModule } from '../logging/logger.module';

@Global()
@Module({
  imports: [ConfigModule, LoggerModule],
  controllers: [MetricsController],
  providers: [SentryService, MetricsService],
  exports: [SentryService, MetricsService],
})
export class MonitoringModule {}
