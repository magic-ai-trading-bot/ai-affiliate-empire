import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { HealthCheckService } from './health-check.service';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logging/logger.module';

@Module({
  imports: [ConfigModule, DatabaseModule, LoggerModule],
  controllers: [HealthController],
  providers: [HealthCheckService],
  exports: [HealthCheckService],
})
export class HealthModule {}
