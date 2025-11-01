import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { PikaLabsService } from './services/pikalabs.service';
import { ElevenLabsService } from './services/elevenlabs.service';
import { VideoComposerService } from './services/video-composer.service';
import { FFmpegService } from './services/ffmpeg.service';
import { FileStorageService } from './services/file-storage.service';
import { ProgressTrackerService } from './services/progress-tracker.service';
import { ThumbnailGeneratorService } from './services/thumbnail-generator.service';

@Module({
  controllers: [VideoController],
  providers: [
    VideoService,
    PikaLabsService,
    ElevenLabsService,
    VideoComposerService,
    FFmpegService,
    FileStorageService,
    ProgressTrackerService,
    ThumbnailGeneratorService,
  ],
  exports: [VideoService, VideoComposerService, ProgressTrackerService],
})
export class VideoModule {}
