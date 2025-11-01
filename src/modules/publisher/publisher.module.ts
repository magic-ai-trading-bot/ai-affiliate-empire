import { Module } from '@nestjs/common';
import { PublisherController } from './publisher.controller';
import { PublisherService } from './publisher.service';
import { YoutubeService } from './services/youtube.service';
import { TiktokService } from './services/tiktok.service';
import { InstagramService } from './services/instagram.service';
import { FileDownloaderService } from './services/file-downloader.service';
import { VideoValidatorService } from './services/video-validator.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { ComplianceModule } from '@/common/compliance/compliance.module';

@Module({
  imports: [ComplianceModule],
  controllers: [PublisherController],
  providers: [
    PublisherService,
    YoutubeService,
    TiktokService,
    InstagramService,
    FileDownloaderService,
    VideoValidatorService,
    RateLimiterService,
  ],
  exports: [PublisherService],
})
export class PublisherModule {}
