import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { PikaLabsService } from './services/pikalabs.service';
import { ElevenLabsService } from './services/elevenlabs.service';
import { VideoComposerService } from './services/video-composer.service';

@Module({
  controllers: [VideoController],
  providers: [
    VideoService,
    PikaLabsService,
    ElevenLabsService,
    VideoComposerService,
  ],
  exports: [VideoService],
})
export class VideoModule {}
