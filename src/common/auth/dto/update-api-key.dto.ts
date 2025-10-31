import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';

enum ApiKeyStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
}

export class UpdateApiKeyDto {
  @ApiProperty({
    example: 'Updated Production API Key',
    description: 'Updated name/description for the API key',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    example: ['products:read', 'products:write', 'analytics:read'],
    description: 'Updated array of permission strings',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiProperty({
    example: 'ACTIVE',
    description: 'API key status',
    enum: ApiKeyStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ApiKeyStatus)
  status?: ApiKeyStatus;
}
