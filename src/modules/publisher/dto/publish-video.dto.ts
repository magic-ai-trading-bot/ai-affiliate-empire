import { IsString, IsArray, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PublishVideoDto {
  @ApiProperty({ description: 'Video ID to publish' })
  @IsString()
  videoId: string;

  @ApiProperty({
    description: 'Platforms to publish to',
    enum: ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'],
    isArray: true,
  })
  @IsArray()
  @IsEnum(['YOUTUBE', 'TIKTOK', 'INSTAGRAM'], { each: true })
  platforms: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  hashtags?: string;
}
