import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/database.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { WeeklyReportService } from './services/weekly-report.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReportsController],
  providers: [ReportsService, WeeklyReportService],
  exports: [ReportsService],
})
export class ReportsModule {}
