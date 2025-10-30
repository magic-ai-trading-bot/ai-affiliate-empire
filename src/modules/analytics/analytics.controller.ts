import { Controller, Get, Post, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard() {
    return this.analyticsService.getDashboardOverview();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getRevenue(@Query('days') days: string) {
    return this.analyticsService.getRevenueAnalytics(parseInt(days) || 30);
  }

  @Get('products/top')
  @ApiOperation({ summary: 'Get top performing products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopProducts(@Query('limit') limit: string) {
    return this.analyticsService.getTopProducts(parseInt(limit) || 10);
  }

  @Get('products/:id/performance')
  @ApiOperation({ summary: 'Get product performance details' })
  async getProductPerformance(@Param('id') id: string) {
    return this.analyticsService.getProductPerformance(id);
  }

  @Get('platforms/comparison')
  @ApiOperation({ summary: 'Compare platform performance' })
  async getPlatformComparison() {
    return this.analyticsService.getPlatformComparison();
  }

  @Post('collect')
  @ApiOperation({ summary: 'Manually trigger analytics collection' })
  async collectAnalytics() {
    return this.analyticsService.collectAllAnalytics();
  }

  @Get('roi')
  @ApiOperation({ summary: 'Get ROI analysis' })
  async getROIAnalysis() {
    return this.analyticsService.getROIAnalysis();
  }
}
