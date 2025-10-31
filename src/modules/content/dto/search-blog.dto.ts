import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum BlogSortBy {
  RELEVANCE = 'relevance',
  RECENT = 'recent',
  POPULAR = 'popular',
}

export class SearchBlogDto {
  @ApiProperty({
    description: 'Search query string',
    example: 'best headphones',
    required: true,
  })
  @IsString()
  q: string;

  @ApiProperty({
    description: 'Filter by category',
    example: 'Electronics',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Filter by tags (comma-separated)',
    example: 'review,budget',
    required: false,
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({
    description: 'Sort order',
    enum: BlogSortBy,
    default: BlogSortBy.RELEVANCE,
    required: false,
  })
  @IsOptional()
  @IsEnum(BlogSortBy)
  sortBy?: BlogSortBy = BlogSortBy.RELEVANCE;

  @ApiProperty({
    description: 'Page number',
    default: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiProperty({
    description: 'Results per page',
    default: 10,
    minimum: 1,
    maximum: 50,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;
}
