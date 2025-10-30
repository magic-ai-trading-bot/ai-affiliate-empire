import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('weekly')
  @ApiOperation({ summary: 'Get weekly report (JSON)' })
  async getWeeklyReport() {
    return this.reportsService.getWeeklyReport();
  }

  @Get('weekly/html')
  @ApiOperation({ summary: 'Get weekly report (HTML)' })
  @Header('Content-Type', 'text/html')
  async getWeeklyReportHTML() {
    return this.reportsService.getWeeklyReportHTML();
  }
}
