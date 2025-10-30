import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'B07XYZ1234', description: 'Amazon ASIN or external product ID' })
  @IsString()
  @IsOptional()
  asin?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  externalId?: string;

  @ApiProperty({ example: 'Premium Wireless Headphones' })
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 99.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'USD', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 5.0, description: 'Commission rate (percentage or fixed amount)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  commission: number;

  @ApiProperty({ example: 'percentage', default: 'percentage' })
  @IsString()
  @IsOptional()
  commissionType?: string;

  @ApiProperty({ example: 'https://amazon.com/dp/B07XYZ1234?tag=affiliate-20' })
  @IsString()
  affiliateUrl: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 'Electronics' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({ description: 'Affiliate network ID' })
  @IsString()
  networkId: string;

  @ApiProperty({ enum: ['ACTIVE', 'PAUSED', 'ARCHIVED'], default: 'ACTIVE' })
  @IsEnum(['ACTIVE', 'PAUSED', 'ARCHIVED'])
  @IsOptional()
  status?: string;
}
