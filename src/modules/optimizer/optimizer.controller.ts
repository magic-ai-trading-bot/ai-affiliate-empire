import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OptimizerService } from './optimizer.service';

@ApiTags('Optimizer')
@Controller('optimizer')
export class OptimizerController {
  constructor(private readonly optimizerService: OptimizerService) {}

  @Post('optimize')
  @ApiOperation({ summary: 'Run optimization cycle' })
  async optimize(
    @Body()
    body: {
      minROI?: number;
      killThreshold?: number;
      scaleThreshold?: number;
    },
  ) {
    return this.optimizerService.optimize(body);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get optimization recommendations' })
  async getRecommendations() {
    return this.optimizerService.getRecommendations();
  }

  @Get('ab-tests')
  @ApiOperation({ summary: 'Get A/B test results' })
  async getABTests() {
    return this.optimizerService.getABTestResults();
  }

  @Post('ab-tests')
  @ApiOperation({ summary: 'Create new A/B test' })
  async createABTest(
    @Body()
    body: {
      name: string;
      variantA: any;
      variantB: any;
      metric: string;
    },
  ) {
    return this.optimizerService.createABTest(body);
  }

  @Get('prompts')
  @ApiOperation({ summary: 'Get prompt performance' })
  async getPromptPerformance() {
    return this.optimizerService.getPromptPerformance();
  }
}
