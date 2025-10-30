import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { MetricsCollectorService } from './services/metrics-collector.service';
import { ROICalculatorService } from './services/roi-calculator.service';
import { PerformanceAnalyzerService } from './services/performance-analyzer.service';

@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    MetricsCollectorService,
    ROICalculatorService,
    PerformanceAnalyzerService,
  ],
  exports: [AnalyticsService, MetricsCollectorService, ROICalculatorService],
})
export class AnalyticsModule {}
