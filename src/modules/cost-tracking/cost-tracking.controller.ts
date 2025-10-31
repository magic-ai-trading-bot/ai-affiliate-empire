import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CostTrackingService } from './cost-tracking.service';
import { RecordCostDto } from './dto/record-cost.dto';
import { UpdateBudgetConfigDto } from './dto/budget-config.dto';
import { DateRangeDto, ExportOptionsDto } from './dto/date-range.dto';

@ApiTags('cost-tracking')
@Controller('cost-tracking')
export class CostTrackingController {
  constructor(private readonly costTracking: CostTrackingService) {}

  // ============================================================================
  // Dashboard & Overview
  // ============================================================================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard data with real-time costs' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboardData() {
    return this.costTracking.getDashboardData();
  }

  @Get('budget/status')
  @ApiOperation({ summary: 'Get current budget status' })
  @ApiResponse({ status: 200, description: 'Budget status retrieved successfully' })
  async getBudgetStatus() {
    return this.costTracking.getBudgetStatus();
  }

  // ============================================================================
  // Cost Recording
  // ============================================================================

  @Post('record')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a cost entry' })
  @ApiResponse({ status: 201, description: 'Cost entry recorded successfully' })
  async recordCost(@Body() dto: RecordCostDto) {
    return this.costTracking.recordCost(dto);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent cost entries' })
  @ApiResponse({ status: 200, description: 'Recent costs retrieved successfully' })
  async getRecentCosts(@Query('limit') limit?: number) {
    return this.costTracking.getRecentCosts(limit);
  }

  // ============================================================================
  // Cost Summaries
  // ============================================================================

  @Get('summary/daily')
  @ApiOperation({ summary: 'Get daily cost summary' })
  @ApiResponse({ status: 200, description: 'Daily summary retrieved successfully' })
  async getDailySummary(@Query('date') date: string) {
    return this.costTracking.getDailySummary(date);
  }

  @Get('summary/monthly')
  @ApiOperation({ summary: 'Get monthly cost summary' })
  @ApiResponse({ status: 200, description: 'Monthly summary retrieved successfully' })
  async getMonthlySummary(
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.costTracking.getMonthlySummary(year, month);
  }

  @Get('summary/current-month')
  @ApiOperation({ summary: 'Get current month total spend' })
  @ApiResponse({ status: 200, description: 'Current month total retrieved' })
  async getCurrentMonthTotal() {
    const total = await this.costTracking.getCurrentMonthTotal();
    return { total };
  }

  @Get('summary/current-day')
  @ApiOperation({ summary: 'Get current day total spend' })
  @ApiResponse({ status: 200, description: 'Current day total retrieved' })
  async getCurrentDayTotal() {
    const total = await this.costTracking.getCurrentDayTotal();
    return { total };
  }

  // ============================================================================
  // Cost Breakdowns
  // ============================================================================

  @Get('breakdown/service')
  @ApiOperation({ summary: 'Get cost breakdown by service' })
  @ApiResponse({ status: 200, description: 'Service breakdown retrieved successfully' })
  async getServiceBreakdown(@Query() dateRange: DateRangeDto) {
    return this.costTracking.getServiceBreakdown(dateRange);
  }

  @Get('breakdown/resource/:resourceId')
  @ApiOperation({ summary: 'Get cost breakdown for a specific resource' })
  @ApiResponse({ status: 200, description: 'Resource breakdown retrieved successfully' })
  async getResourceBreakdown(@Param('resourceId') resourceId: string) {
    return this.costTracking.getResourceBreakdown(resourceId);
  }

  // ============================================================================
  // Trends & Projections
  // ============================================================================

  @Get('trends')
  @ApiOperation({ summary: 'Get cost trends over time' })
  @ApiResponse({ status: 200, description: 'Cost trends retrieved successfully' })
  async getCostTrends(@Query('days') days?: number) {
    return this.costTracking.getCostTrends(days);
  }

  @Get('projections')
  @ApiOperation({ summary: 'Get monthly cost projection' })
  @ApiResponse({ status: 200, description: 'Projection calculated successfully' })
  async getMonthlyProjection() {
    const projection = await this.costTracking.getMonthlyProjection();
    return { projection };
  }

  // ============================================================================
  // Optimizations
  // ============================================================================

  @Get('optimizations')
  @ApiOperation({ summary: 'Get cost optimization recommendations' })
  @ApiResponse({ status: 200, description: 'Optimizations retrieved successfully' })
  async getOptimizations(@Query('status') status?: string) {
    return this.costTracking.getOptimizations(status);
  }

  @Post('optimizations/:id/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a cost optimization' })
  @ApiResponse({ status: 200, description: 'Optimization applied successfully' })
  async applyOptimization(@Param('id') id: string) {
    return this.costTracking.applyOptimization(id);
  }

  @Post('optimizations/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a cost optimization' })
  @ApiResponse({ status: 200, description: 'Optimization rejected successfully' })
  async rejectOptimization(@Param('id') id: string) {
    return this.costTracking.rejectOptimization(id);
  }

  // ============================================================================
  // Reports
  // ============================================================================

  @Get('reports/daily')
  @ApiOperation({ summary: 'Get daily cost report' })
  @ApiResponse({ status: 200, description: 'Daily report generated successfully' })
  async getDailyReport(@Query('date') date: string) {
    return this.costTracking.getDailyReport(date);
  }

  @Get('reports/weekly')
  @ApiOperation({ summary: 'Get weekly cost report' })
  @ApiResponse({ status: 200, description: 'Weekly report generated successfully' })
  async getWeeklyReport() {
    return this.costTracking.getWeeklyReport();
  }

  @Get('reports/monthly')
  @ApiOperation({ summary: 'Get monthly cost report' })
  @ApiResponse({ status: 200, description: 'Monthly report generated successfully' })
  async getMonthlyReport() {
    return this.costTracking.getMonthlyReport();
  }

  @Get('reports/export')
  @ApiOperation({ summary: 'Export cost report as CSV or JSON' })
  @ApiResponse({ status: 200, description: 'Report exported successfully' })
  async exportReport(@Query() options: ExportOptionsDto) {
    return this.costTracking.exportReport(options);
  }

  // ============================================================================
  // Budget Configuration
  // ============================================================================

  @Get('budget/config')
  @ApiOperation({ summary: 'Get budget configuration' })
  @ApiResponse({ status: 200, description: 'Budget config retrieved successfully' })
  async getBudgetConfig() {
    return this.costTracking.getBudgetConfig();
  }

  @Put('budget/config')
  @ApiOperation({ summary: 'Update budget configuration' })
  @ApiResponse({ status: 200, description: 'Budget config updated successfully' })
  async updateBudgetConfig(@Body() dto: UpdateBudgetConfigDto) {
    return this.costTracking.updateBudgetConfig(dto);
  }

  // ============================================================================
  // Alerts
  // ============================================================================

  @Get('alerts')
  @ApiOperation({ summary: 'Get budget alert history' })
  @ApiResponse({ status: 200, description: 'Alerts retrieved successfully' })
  async getAlerts(
    @Query('limit') limit?: number,
    @Query('level') level?: string,
  ) {
    return this.costTracking.getAlerts(limit, level);
  }

  @Post('alerts/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send test alert' })
  @ApiResponse({ status: 200, description: 'Test alert sent successfully' })
  async sendTestAlert() {
    return this.costTracking.sendTestAlert();
  }

  // ============================================================================
  // Manual Triggers
  // ============================================================================

  @Post('aggregate/daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger daily cost aggregation' })
  @ApiResponse({ status: 200, description: 'Aggregation completed successfully' })
  async triggerDailyAggregation(@Query('date') date?: string) {
    return this.costTracking.triggerDailyAggregation(date);
  }

  @Post('budget/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually check budget thresholds' })
  @ApiResponse({ status: 200, description: 'Budget check completed successfully' })
  async checkBudgetThresholds() {
    return this.costTracking.checkBudgetThresholds();
  }

  @Post('optimizations/analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger optimization analysis' })
  @ApiResponse({ status: 200, description: 'Analysis completed successfully' })
  async analyzeOptimizations() {
    return this.costTracking.analyzeOptimizations();
  }
}
