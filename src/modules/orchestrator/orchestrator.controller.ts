import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrchestratorService } from './orchestrator.service';
import { StartDailyLoopDto } from './dto/start-daily-loop.dto';

@ApiTags('orchestrator')
@Controller('orchestrator')
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('daily-loop/start')
  @ApiOperation({ summary: 'Start daily control loop manually' })
  @ApiResponse({ status: 200, description: 'Daily loop started' })
  async startDailyLoop(@Body() dto: StartDailyLoopDto) {
    return this.orchestratorService.startDailyControlLoop(dto);
  }

  @Get('daily-loop/status/:workflowId')
  @ApiOperation({ summary: 'Get daily loop status' })
  async getDailyLoopStatus(@Param('workflowId') workflowId: string) {
    return this.orchestratorService.getWorkflowStatus(workflowId);
  }

  @Get('workflow-logs')
  @ApiOperation({ summary: 'Get workflow execution logs' })
  async getWorkflowLogs() {
    return this.orchestratorService.getWorkflowLogs();
  }

  @Post('weekly-optimization/start')
  @ApiOperation({ summary: 'Start weekly optimization' })
  async startWeeklyOptimization() {
    return this.orchestratorService.startWeeklyOptimization();
  }
}
