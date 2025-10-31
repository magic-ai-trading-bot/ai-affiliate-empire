import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { CostService } from '@prisma/client';
import { CostCalculatorService } from './cost-calculator.service';
import { CostEntryData } from '../interfaces/cost-entry.interface';
import { RecordCostDto } from '../dto/record-cost.dto';

@Injectable()
export class CostRecorderService {
  private readonly logger = new Logger(CostRecorderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: CostCalculatorService,
  ) {}

  /**
   * Record a cost entry in the database
   */
  async recordCost(data: RecordCostDto | CostEntryData) {
    try {
      const costEntry = await this.prisma.costEntry.create({
        data: {
          service: data.service,
          operation: data.operation,
          amount: data.amount,
          currency: data.currency || 'USD',
          tokens: data.tokens,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          duration: data.duration,
          storageBytes: data.storageBytes,
          computeMinutes: data.computeMinutes,
          resourceId: data.resourceId,
          resourceType: data.resourceType,
          metadata: data.metadata || {},
          provider: data.provider,
          model: data.model,
        },
      });

      this.logger.log(
        `Cost recorded: $${data.amount.toFixed(4)} for ${data.service}/${data.operation}`,
      );

      return costEntry;
    } catch (error) {
      this.logger.error(`Failed to record cost: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Record OpenAI API cost
   */
  async recordOpenAICost(
    inputTokens: number,
    outputTokens: number,
    model: string = 'gpt-4-turbo',
    resourceId?: string,
    resourceType?: string,
  ) {
    const calculation = this.calculator.calculateOpenAICost(inputTokens, outputTokens, model);

    return this.recordCost({
      service: CostService.OPENAI,
      operation: calculation.operation,
      amount: calculation.amount,
      inputTokens: calculation.details.inputTokens!,
      outputTokens: calculation.details.outputTokens!,
      tokens: calculation.details.tokens!,
      model: calculation.details.model!,
      provider: calculation.details.provider!,
      resourceId,
      resourceType,
    });
  }

  /**
   * Record Claude API cost
   */
  async recordClaudeCost(
    inputTokens: number,
    outputTokens: number,
    model: string = 'claude-3.5-sonnet',
    resourceId?: string,
    resourceType?: string,
  ) {
    const calculation = this.calculator.calculateClaudeCost(inputTokens, outputTokens, model);

    return this.recordCost({
      service: CostService.CLAUDE,
      operation: calculation.operation,
      amount: calculation.amount,
      inputTokens: calculation.details.inputTokens!,
      outputTokens: calculation.details.outputTokens!,
      tokens: calculation.details.tokens!,
      model: calculation.details.model!,
      provider: calculation.details.provider!,
      resourceId,
      resourceType,
    });
  }

  /**
   * Record ElevenLabs TTS cost
   */
  async recordElevenLabsCost(
    characters: number,
    resourceId?: string,
    resourceType?: string,
  ) {
    const calculation = this.calculator.calculateElevenLabsCost(characters);

    return this.recordCost({
      service: CostService.ELEVENLABS,
      operation: calculation.operation,
      amount: calculation.amount,
      duration: calculation.details.duration!,
      provider: calculation.details.provider!,
      resourceId,
      resourceType,
      metadata: { characters },
    });
  }

  /**
   * Record Pika Labs video generation cost
   */
  async recordPikaCost(
    durationSeconds: number,
    resourceId?: string,
    resourceType?: string,
  ) {
    const calculation = this.calculator.calculatePikaCost(durationSeconds);

    return this.recordCost({
      service: CostService.PIKA,
      operation: calculation.operation,
      amount: calculation.amount,
      duration: calculation.details.duration!,
      provider: calculation.details.provider!,
      resourceId,
      resourceType,
    });
  }

  /**
   * Record DALL-E image generation cost
   */
  async recordDalleCost(
    resolution: string = '1024x1024',
    resourceId?: string,
    resourceType?: string,
  ) {
    const calculation = this.calculator.calculateDalleCost(resolution);

    return this.recordCost({
      service: CostService.DALLE,
      operation: calculation.operation,
      amount: calculation.amount,
      model: calculation.details.model!,
      provider: calculation.details.provider!,
      resourceId,
      resourceType,
      metadata: { resolution },
    });
  }

  /**
   * Record storage cost
   */
  async recordStorageCost(
    bytes: bigint,
    service: 's3' | 'r2' = 's3',
    resourceId?: string,
    resourceType?: string,
  ) {
    const calculation = this.calculator.calculateStorageCost(bytes, service);

    return this.recordCost({
      service: CostService.S3,
      operation: calculation.operation,
      amount: calculation.amount,
      storageBytes: bytes,
      provider: calculation.details.provider!,
      resourceId,
      resourceType,
    });
  }

  /**
   * Record compute cost
   */
  async recordComputeCost(
    minutes: number,
    service: 'flyio' | 'temporal' = 'flyio',
    resourceId?: string,
    resourceType?: string,
  ) {
    const calculation = this.calculator.calculateComputeCost(minutes, service);

    return this.recordCost({
      service: CostService.COMPUTE,
      operation: calculation.operation,
      amount: calculation.amount,
      computeMinutes: calculation.details.computeMinutes!,
      provider: calculation.details.provider!,
      resourceId,
      resourceType,
    });
  }

  /**
   * Get cost entries for a specific resource
   */
  async getCostsByResource(resourceId: string, resourceType?: string) {
    return this.prisma.costEntry.findMany({
      where: {
        resourceId,
        ...(resourceType && { resourceType }),
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Get total cost for a resource
   */
  async getTotalCostForResource(resourceId: string, resourceType?: string): Promise<number> {
    const result = await this.prisma.costEntry.aggregate({
      where: {
        resourceId,
        ...(resourceType && { resourceType }),
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount || 0);
  }

  /**
   * Get recent cost entries
   */
  async getRecentCosts(limit: number = 100) {
    return this.prisma.costEntry.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
    });
  }
}
