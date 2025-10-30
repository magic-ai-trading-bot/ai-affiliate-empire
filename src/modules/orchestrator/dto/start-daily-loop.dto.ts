import { IsOptional, IsNumber, IsArray, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartDailyLoopDto {
  @ApiProperty({ required: false, default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxProducts?: number;

  @ApiProperty({
    required: false,
    enum: ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'],
    isArray: true,
    default: ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(['YOUTUBE', 'TIKTOK', 'INSTAGRAM'], { each: true })
  platforms?: string[];
}
