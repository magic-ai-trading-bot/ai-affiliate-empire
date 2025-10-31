import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/database.module';
import { CostTrackingController } from './cost-tracking.controller';
import { CostTrackingService } from './cost-tracking.service';
import { CostRecorderService } from './services/cost-recorder.service';
import { CostCalculatorService } from './services/cost-calculator.service';
import { CostAggregatorService } from './services/cost-aggregator.service';
import { BudgetMonitorService } from './services/budget-monitor.service';
import { AlertService } from './services/alert.service';
import { OptimizationService } from './services/optimization.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CostTrackingController],
  providers: [
    CostTrackingService,
    CostRecorderService,
    CostCalculatorService,
    CostAggregatorService,
    BudgetMonitorService,
    AlertService,
    OptimizationService,
  ],
  exports: [
    CostTrackingService,
    CostRecorderService,
    CostCalculatorService,
  ],
})
export class CostTrackingModule {}
