import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  getHealth(): { status: string; message: string; timestamp: string } {
    return this.appService.getHealth();
  }

  @Get('status')
  @ApiOperation({ summary: 'System status' })
  @ApiResponse({ status: 200, description: 'System status information' })
  getStatus() {
    return this.appService.getStatus();
  }
}
