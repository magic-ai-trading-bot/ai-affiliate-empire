import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@temporalio/client';
import { PrismaService } from '@/common/database/prisma.service';
import { getTemporalClient, closeTemporalClient } from '../../temporal/client';
import { StartDailyLoopDto } from './dto/start-daily-loop.dto';

@Injectable()
export class OrchestratorService implements OnModuleInit, OnModuleDestroy {
  private temporalClient: Client | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    try {
      this.temporalClient = await getTemporalClient(this.config);
      console.log('✅ Orchestrator service initialized with Temporal client');
    } catch (error) {
      console.error('⚠️ Temporal not available, orchestrator in mock mode:', error.message);
    }
  }

  async onModuleDestroy() {
    await closeTemporalClient();
  }

  /**
   * Start daily control loop workflow
   */
  async startDailyControlLoop(dto: StartDailyLoopDto) {
    const workflowId = `daily-${new Date().toISOString().split('T')[0]}`;

    console.log(`🚀 Starting daily control loop: ${workflowId}`);

    if (!this.temporalClient) {
      console.warn('⚠️ Temporal client not available, returning mock response');
      return {
        workflowId,
        status: 'mock_mode',
        message: 'Temporal not configured. Install and start Temporal server.',
      };
    }

    try {
      const handle = await this.temporalClient.workflow.start('dailyControlLoop', {
        taskQueue: 'ai-affiliate-empire',
        workflowId,
        args: [
          {
            maxProducts: dto.maxProducts || 10,
            platforms: dto.platforms || ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'],
          },
        ],
      });

      console.log(`✅ Daily control loop started: ${workflowId}`);

      return {
        workflowId: handle.workflowId,
        runId: handle.firstExecutionRunId,
        status: 'started',
      };
    } catch (error) {
      console.error('Error starting daily control loop:', error);
      throw error;
    }
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string) {
    if (!this.temporalClient) {
      return {
        workflowId,
        status: 'mock_mode',
      };
    }

    try {
      const handle = this.temporalClient.workflow.getHandle(workflowId);
      const description = await handle.describe();

      return {
        workflowId,
        status: description.status.name,
        startTime: description.startTime,
      };
    } catch (error) {
      console.error('Error getting workflow status:', error);
      throw error;
    }
  }

  /**
   * Get workflow execution logs from database
   */
  async getWorkflowLogs(limit: number = 50) {
    const logs = await this.prisma.workflowLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs;
  }

  /**
   * Start weekly optimization workflow
   */
  async startWeeklyOptimization() {
    const workflowId = `weekly-${new Date().toISOString().split('T')[0]}`;

    console.log(`📈 Starting weekly optimization: ${workflowId}`);

    if (!this.temporalClient) {
      return {
        workflowId,
        status: 'mock_mode',
      };
    }

    try {
      const handle = await this.temporalClient.workflow.start('weeklyOptimization', {
        taskQueue: 'ai-affiliate-empire',
        workflowId,
        args: [],
      });

      return {
        workflowId: handle.workflowId,
        status: 'started',
      };
    } catch (error) {
      console.error('Error starting weekly optimization:', error);
      throw error;
    }
  }

  /**
   * Schedule daily loop to run automatically at midnight
   */
  async scheduleDailyLoop() {
    // TODO: Implement Temporal Schedule
    // This would create a schedule that runs dailyControlLoop every 24 hours
    console.log('📅 Scheduling daily loop (not implemented yet)');
  }
}
