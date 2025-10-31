import { IsEnum, IsString, IsNumber, IsOptional, IsObject, Min } from 'class-validator';
import { CostService } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class RecordCostDto {
  @ApiProperty({ enum: CostService, description: 'Service that incurred the cost' })
  @IsEnum(CostService)
  service: CostService;

  @ApiProperty({ description: 'Operation name (e.g., gpt-4-completion)' })
  @IsString()
  operation: string;

  @ApiProperty({ description: 'Cost amount in USD', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Provider name', example: 'openai' })
  @IsString()
  provider: string;

  @ApiProperty({ description: 'Model name', example: 'gpt-4-turbo', required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ description: 'Total tokens used', required: false })
  @IsOptional()
  @IsNumber()
  tokens?: number;

  @ApiProperty({ description: 'Input tokens', required: false })
  @IsOptional()
  @IsNumber()
  inputTokens?: number;

  @ApiProperty({ description: 'Output tokens', required: false })
  @IsOptional()
  @IsNumber()
  outputTokens?: number;

  @ApiProperty({ description: 'Duration in seconds', required: false })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiProperty({ description: 'Storage in bytes', required: false })
  @IsOptional()
  @IsNumber()
  storageBytes?: number;

  @ApiProperty({ description: 'Compute minutes', required: false })
  @IsOptional()
  @IsNumber()
  computeMinutes?: number;

  @ApiProperty({ description: 'Associated resource ID', required: false })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiProperty({ description: 'Resource type', required: false })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
