import { Controller, Get, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { LoggerService } from '../logging/logger.service';
import { HealthCheckService } from './health-check.service';
import {
  ComponentStatus,
  HealthCheckResponse,
} from './dto/health-response.dto';

@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('HealthController');
  }

  @Get()
  @ApiOperation({ summary: 'Comprehensive health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async healthCheck(): Promise<HealthCheckResponse> {
    const [database, temporal, externalApis] = await Promise.all([
      this.healthCheckService.checkDatabase(),
      this.healthCheckService.checkTemporal(),
      this.healthCheckService.checkExternalApis(),
    ]);

    // Determine overall status
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    if (
      database.status === ComponentStatus.UNHEALTHY ||
      temporal.status === ComponentStatus.UNHEALTHY
    ) {
      overallStatus = 'unhealthy';
    } else if (
      database.status === ComponentStatus.DEGRADED ||
      temporal.status === ComponentStatus.DEGRADED ||
      externalApis.status === ComponentStatus.DEGRADED ||
      externalApis.status === ComponentStatus.UNHEALTHY
    ) {
      overallStatus = 'degraded';
    }

    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || 'production',
      components: {
        database,
        temporal,
        externalApis,
      },
      memory: {
        used: heapUsedMB,
        total: heapTotalMB,
        percentage: Math.round((heapUsedMB / heapTotalMB) * 100),
      },
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check - is service ready to serve requests',
  })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  @HttpCode(HttpStatus.OK)
  async readinessCheck() {
    const [database, temporal] = await Promise.all([
      this.healthCheckService.checkDatabase(),
      this.healthCheckService.checkTemporal(),
    ]);

    const isReady =
      database.status === ComponentStatus.HEALTHY &&
      temporal.status === ComponentStatus.HEALTHY;

    if (!isReady) {
      this.logger.warn(
        `Readiness check failed - database: ${database.status}, temporal: ${temporal.status}`,
      );
    }

    return {
      ready: isReady,
      timestamp: new Date().toISOString(),
      components: {
        database: database.status,
        temporal: temporal.status,
      },
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check - is service process running' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async livenessCheck() {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    };
  }
}
