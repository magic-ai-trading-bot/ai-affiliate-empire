import { Module } from '@nestjs/common';
import { FtcDisclosureService } from './ftc-disclosure.service';

@Module({
  providers: [FtcDisclosureService],
  exports: [FtcDisclosureService],
})
export class ComplianceModule {}
