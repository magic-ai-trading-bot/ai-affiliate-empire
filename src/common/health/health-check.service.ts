import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { LoggerService } from '../logging/logger.service';
import { Connection } from '@temporalio/client';
import axios from 'axios';
import { ComponentStatus, ComponentHealth } from './dto/health-response.dto';

@Injectable()
export class HealthCheckService {
  private healthCache: Map<string, { result: ComponentHealth; timestamp: number }> = new Map();
  private readonly cacheTTL = 30000; // 30 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('HealthCheckService');
  }

  async checkDatabase(): Promise<ComponentHealth> {
    const cached = this.getFromCache('database');
    if (cached) return cached;

    try {
      const startTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const duration = Date.now() - startTime;

      const result: ComponentHealth = {
        status: ComponentStatus.HEALTHY,
        message: 'Database connection successful',
        details: {
          responseTime: `${duration}ms`,
        },
        lastCheck: new Date().toISOString(),
      };

      this.setCache('database', result);
      return result;
    } catch (error) {
      this.logger.error('Database health check failed', error.stack);
      const result: ComponentHealth = {
        status: ComponentStatus.UNHEALTHY,
        message: 'Database connection failed',
        details: {
          error: error.message,
        },
        lastCheck: new Date().toISOString(),
      };

      this.setCache('database', result);
      return result;
    }
  }

  async checkTemporal(): Promise<ComponentHealth> {
    const cached = this.getFromCache('temporal');
    if (cached) return cached;

    try {
      const temporalAddress =
        this.configService.get<string>('TEMPORAL_ADDRESS') || 'localhost:7233';
      const startTime = Date.now();

      // Try to create a connection
      const connection = await Connection.connect({
        address: temporalAddress,
      });

      await connection.workflowService.getSystemInfo({});
      void connection.close();

      const duration = Date.now() - startTime;

      const result: ComponentHealth = {
        status: ComponentStatus.HEALTHY,
        message: 'Temporal connection successful',
        details: {
          address: temporalAddress,
          responseTime: `${duration}ms`,
        },
        lastCheck: new Date().toISOString(),
      };

      this.setCache('temporal', result);
      return result;
    } catch (error) {
      this.logger.error('Temporal health check failed', error.stack);
      const result: ComponentHealth = {
        status: ComponentStatus.UNHEALTHY,
        message: 'Temporal connection failed',
        details: {
          error: error.message,
        },
        lastCheck: new Date().toISOString(),
      };

      this.setCache('temporal', result);
      return result;
    }
  }

  async checkExternalApis(): Promise<ComponentHealth> {
    const cached = this.getFromCache('externalApis');
    if (cached) return cached;

    const apiChecks = {
      openai: false,
    };

    let healthyCount = 0;
    const totalApis = Object.keys(apiChecks).length;

    // Check OpenAI API
    try {
      const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (openaiKey && openaiKey !== 'mock') {
        await axios.get('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${openaiKey}` },
          timeout: 5000,
        });
        apiChecks.openai = true;
        healthyCount++;
      }
    } catch (error) {
      this.logger.warn('OpenAI API health check failed', error.message);
    }

    let status: ComponentStatus;
    let message: string;

    if (healthyCount === 0) {
      status = ComponentStatus.UNHEALTHY;
      message = 'All external APIs are unavailable';
    } else if (healthyCount < totalApis) {
      status = ComponentStatus.DEGRADED;
      message = `${healthyCount}/${totalApis} external APIs are available`;
    } else {
      status = ComponentStatus.HEALTHY;
      message = 'All external APIs are available';
    }

    const result: ComponentHealth = {
      status,
      message,
      details: apiChecks,
      lastCheck: new Date().toISOString(),
    };

    this.setCache('externalApis', result);
    return result;
  }

  private getFromCache(key: string): ComponentHealth | null {
    const cached = this.healthCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTTL) {
      this.healthCache.delete(key);
      return null;
    }

    return cached.result;
  }

  private setCache(key: string, result: ComponentHealth): void {
    this.healthCache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  clearCache(): void {
    this.healthCache.clear();
  }
}
