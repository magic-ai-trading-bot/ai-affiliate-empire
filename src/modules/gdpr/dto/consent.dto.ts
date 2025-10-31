import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateConsentDto {
  @IsBoolean()
  @IsOptional()
  analytics?: boolean;

  @IsBoolean()
  @IsOptional()
  marketing?: boolean;

  @IsBoolean()
  @IsOptional()
  functional?: boolean;

  @IsBoolean()
  @IsOptional()
  advertising?: boolean;
}

export class ConsentResponseDto {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  advertising: boolean;
  updatedAt: Date;
}
