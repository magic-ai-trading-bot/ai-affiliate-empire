import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/database.module';
import { OptimizerController } from './optimizer.controller';
import { OptimizerService } from './optimizer.service';
import { StrategyOptimizerService } from './services/strategy-optimizer.service';
import { ABTestingService } from './services/ab-testing.service';
import { AutoScalerService } from './services/auto-scaler.service';
import { PromptVersioningService } from './services/prompt-versioning.service';

@Module({
  imports: [DatabaseModule],
  controllers: [OptimizerController],
  providers: [
    OptimizerService,
    StrategyOptimizerService,
    ABTestingService,
    AutoScalerService,
    PromptVersioningService,
  ],
  exports: [OptimizerService],
})
export class OptimizerModule {}
