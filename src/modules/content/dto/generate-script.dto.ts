import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateScriptDto {
  @ApiProperty({ description: 'Product ID to generate script for' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 'en', default: 'en', enum: ['en', 'vi', 'es'] })
  @IsEnum(['en', 'vi', 'es'])
  @IsOptional()
  language?: string;

  @ApiProperty({ example: 'engaging', default: 'engaging' })
  @IsString()
  @IsOptional()
  tone?: string;
}
