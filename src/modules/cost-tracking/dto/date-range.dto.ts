import { IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DateRangeDto {
  @ApiProperty({ description: 'Start date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ExportOptionsDto extends DateRangeDto {
  @ApiProperty({ description: 'Report format', enum: ['csv', 'json'], default: 'csv' })
  @IsOptional()
  format?: 'csv' | 'json';
}
