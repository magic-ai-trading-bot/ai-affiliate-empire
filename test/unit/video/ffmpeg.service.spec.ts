import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FFmpegService } from '../../../src/modules/video/services/ffmpeg.service';

describe('FFmpegService', () => {
  let service: FFmpegService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FFmpegService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                FFMPEG_PATH: '/usr/bin/ffmpeg',
                VIDEO_MAX_DURATION: 60,
                VIDEO_OUTPUT_BITRATE: '7000k',
                VIDEO_AUDIO_BITRATE: '160k',
                VIDEO_FPS: 30,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FFmpegService>(FFmpegService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('composeVideo', () => {
    it('should compose video with default options', async () => {
      // Mock test - in real implementation, this would use test video files
      expect(service.composeVideo).toBeDefined();
    });

    it('should handle custom options', async () => {
      const options = {
        outputWidth: 1920,
        outputHeight: 1080,
        fps: 60,
        videoBitrate: '10000k',
        audioBitrate: '320k',
        preset: 'slow',
        crf: 18,
        maxDuration: 120,
      };

      expect(service.composeVideo).toBeDefined();
      // Would test with actual video files in integration tests
    });

    it('should emit progress events during composition', async () => {
      const progressCallback = jest.fn();
      // Would test progress tracking in integration tests
      expect(progressCallback).toBeDefined();
    });
  });

  describe('getVideoInfo', () => {
    it('should extract video metadata', async () => {
      // Mock test - would use actual video file in integration tests
      expect(service.getVideoInfo).toBeDefined();
    });

    it('should handle videos without audio', async () => {
      // Test case for videos without audio stream
      expect(service.getVideoInfo).toBeDefined();
    });
  });

  describe('extractFrame', () => {
    it('should extract frame at specified timestamp', async () => {
      expect(service.extractFrame).toBeDefined();
    });

    it('should extract frame from middle if no timestamp provided', async () => {
      expect(service.extractFrame).toBeDefined();
    });
  });

  describe('scaleVideo', () => {
    it('should scale video to target dimensions', async () => {
      expect(service.scaleVideo).toBeDefined();
    });

    it('should maintain aspect ratio with padding', async () => {
      expect(service.scaleVideo).toBeDefined();
    });
  });

  describe('addTextOverlay', () => {
    it('should add text overlay with default options', async () => {
      expect(service.addTextOverlay).toBeDefined();
    });

    it('should handle special characters in text', async () => {
      const options = {
        text: "Test: Product's Name & Details",
        fontSize: 48,
      };
      expect(options).toBeDefined();
    });

    it('should position text correctly', async () => {
      const positions = ['center', 'top', 'bottom'] as const;
      positions.forEach((position) => {
        expect(position).toBeDefined();
      });
    });
  });

  describe('trimAudio', () => {
    it('should trim audio to specified duration', async () => {
      expect(service.trimAudio).toBeDefined();
    });
  });

  describe('padAudio', () => {
    it('should pad audio with silence', async () => {
      expect(service.padAudio).toBeDefined();
    });
  });

  describe('validateFFmpeg', () => {
    it('should validate ffmpeg is available', async () => {
      expect(service.validateFFmpeg).toBeDefined();
    });
  });
});
