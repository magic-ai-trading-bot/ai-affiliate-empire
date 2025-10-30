import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateVideoDto {
  @ApiProperty({ description: 'Video ID to regenerate (optional)', required: false })
  @IsString()
  @IsOptional()
  videoId?: string;

  @ApiProperty({ description: 'Product ID to generate video for', required: false })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({ description: 'Script for video', required: false })
  @IsString()
  @IsOptional()
  script?: string;
}
