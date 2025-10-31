import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsDateString, MinLength, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({
    example: 'Production API Key',
    description: 'Name/description for the API key',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: ['products:read', 'products:write', 'analytics:read'],
    description: 'Array of permission strings',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiProperty({
    example: '2025-12-31T23:59:59Z',
    description: 'Expiration date for the API key',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
