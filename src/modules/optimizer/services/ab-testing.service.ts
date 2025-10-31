import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';

export interface ABTest {
  id: string;
  name: string;
  variantA: any;
  variantB: any;
  metric: string;
  status: string;
  results?: {
    variantAValue: number;
    variantBValue: number;
    winner: string;
    confidence: number;
  };
}

@Injectable()
export class ABTestingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create new A/B test
   */
  async createTest(params: {
    name: string;
    variantA: any;
    variantB: any;
    metric: string;
  }): Promise<ABTest> {
    console.log(`🧪 Creating A/B test: ${params.name}`);

    // Store in system config
    const config = await this.getOrCreateConfig();
    const configData = JSON.parse(config.value) as any;
    const tests = configData.abTests || [];

    const newTest: ABTest = {
      id: `test_${Date.now()}`,
      name: params.name,
      variantA: params.variantA,
      variantB: params.variantB,
      metric: params.metric,
      status: 'running',
    };

    tests.push(newTest);

    await this.prisma.systemConfig.update({
      where: { id: config.id },
      data: {
        value: JSON.stringify({
          ...(JSON.parse(config.value) as object),
          abTests: tests,
        }),
      },
    });

    return newTest;
  }

  /**
   * Analyze all running tests
   */
  async analyzeTests() {
    console.log('🔬 Analyzing A/B tests...');

    const config = await this.getOrCreateConfig();
    const configData = JSON.parse(config.value) as any;
    const tests = (configData.abTests || []) as ABTest[];

    const results = [];

    for (const test of tests) {
      if (test.status === 'running') {
        const result = await this.analyzeTest(test);
        results.push(result);

        // Update test with results
        test.results = result;
        if (result.confidence > 95) {
          test.status = 'completed';
        }
      }
    }

    // Save updated tests
    await this.prisma.systemConfig.update({
      where: { id: config.id },
      data: {
        value: JSON.stringify({
          ...(JSON.parse(config.value) as object),
          abTests: tests,
        }),
      },
    });

    console.log(`✅ Analyzed ${results.length} A/B tests`);

    return {
      analyzed: results.length,
      completed: results.filter((r: any) => r.confidence > 95).length,
      results,
    };
  }

  /**
   * Analyze single test
   */
  private async analyzeTest(test: ABTest) {
    // Mock analysis - in production, collect real metrics
    const variantAValue = Math.random() * 100;
    const variantBValue = Math.random() * 100;

    const winner = variantAValue > variantBValue ? 'A' : 'B';
    const difference = Math.abs(variantAValue - variantBValue);
    const confidence = Math.min(99, 50 + difference);

    return {
      testId: test.id,
      testName: test.name,
      variantAValue,
      variantBValue,
      winner,
      confidence,
      recommendation:
        confidence > 95
          ? `Deploy variant ${winner}`
          : 'Continue testing for statistical significance',
    };
  }

  /**
   * Get all test results
   */
  async getResults() {
    const config = await this.getOrCreateConfig();
    const configData = JSON.parse(config.value) as any;
    const tests = (configData.abTests || []) as ABTest[];

    return {
      total: tests.length,
      running: tests.filter((t: ABTest) => t.status === 'running').length,
      completed: tests.filter((t: ABTest) => t.status === 'completed').length,
      tests: tests.map((t: ABTest) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        results: t.results,
      })),
    };
  }

  /**
   * Common A/B test scenarios
   */
  async createCommonTests() {
    const tests = [
      {
        name: 'Script Tone: Enthusiastic vs Educational',
        variantA: { tone: 'enthusiastic' },
        variantB: { tone: 'educational' },
        metric: 'ctr',
      },
      {
        name: 'CTA Position: Beginning vs End',
        variantA: { ctaPosition: 'beginning' },
        variantB: { ctaPosition: 'end' },
        metric: 'conversions',
      },
      {
        name: 'Video Length: 30s vs 60s',
        variantA: { duration: 30 },
        variantB: { duration: 60 },
        metric: 'engagement',
      },
      {
        name: 'Thumbnail Style: Product vs Lifestyle',
        variantA: { thumbnailStyle: 'product' },
        variantB: { thumbnailStyle: 'lifestyle' },
        metric: 'views',
      },
    ];

    const created = [];
    for (const test of tests) {
      const result = await this.createTest(test);
      created.push(result);
    }

    return {
      created: created.length,
      tests: created,
    };
  }

  private async getOrCreateConfig() {
    let config = await this.prisma.systemConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!config) {
      config = await this.prisma.systemConfig.create({
        data: {
          key: 'ab_testing_config',
          value: JSON.stringify({})
        },
      });
    }

    return config;
  }
}
