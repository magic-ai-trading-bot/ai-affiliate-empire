import { IsNumber, IsInt, IsBoolean, IsArray, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBudgetConfigDto {
  @ApiProperty({ description: 'Monthly budget limit in USD', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyLimit?: number;

  @ApiProperty({ description: 'Daily budget limit in USD', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyLimit?: number;

  @ApiProperty({ description: 'Warning threshold percentage', minimum: 0, maximum: 200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  warningThreshold?: number;

  @ApiProperty({ description: 'Critical threshold percentage', minimum: 0, maximum: 200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  criticalThreshold?: number;

  @ApiProperty({ description: 'Emergency threshold percentage', minimum: 0, maximum: 200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  emergencyThreshold?: number;

  @ApiProperty({ description: 'Enable email alerts' })
  @IsOptional()
  @IsBoolean()
  emailAlerts?: boolean;

  @ApiProperty({ description: 'Enable Slack alerts' })
  @IsOptional()
  @IsBoolean()
  slackAlerts?: boolean;

  @ApiProperty({ description: 'Email recipients', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emailRecipients?: string[];

  @ApiProperty({ description: 'Slack webhook URL' })
  @IsOptional()
  @IsString()
  slackWebhookUrl?: string;

  @ApiProperty({ description: 'Enable auto scale down' })
  @IsOptional()
  @IsBoolean()
  autoScaleDown?: boolean;

  @ApiProperty({ description: 'Enable emergency stop' })
  @IsOptional()
  @IsBoolean()
  emergencyStop?: boolean;
}
