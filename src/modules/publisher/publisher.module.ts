import { Module } from '@nestjs/common';
import { PublisherController } from './publisher.controller';
import { PublisherService } from './publisher.service';
import { YoutubeService } from './services/youtube.service';
import { TiktokService } from './services/tiktok.service';
import { InstagramService } from './services/instagram.service';

@Module({
  controllers: [PublisherController],
  providers: [
    PublisherService,
    YoutubeService,
    TiktokService,
    InstagramService,
  ],
  exports: [PublisherService],
})
export class PublisherModule {}
