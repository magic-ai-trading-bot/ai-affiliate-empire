import { Module } from '@nestjs/common';
import { FtcDisclosureService } from './ftc-disclosure.service';
import { FtcDisclosureValidatorService } from './ftc-disclosure-validator.service';

@Module({
  providers: [FtcDisclosureService, FtcDisclosureValidatorService],
  exports: [FtcDisclosureService, FtcDisclosureValidatorService],
})
export class ComplianceModule {}
