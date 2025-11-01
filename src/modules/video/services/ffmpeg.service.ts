import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ffmpegInstaller from 'fluent-ffmpeg';
import * as path from 'path';

const ffmpeg = ffmpegInstaller.default || ffmpegInstaller;

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: string;
  hasAudio: boolean;
}

export interface TextOverlayOptions {
  text: string;
  fontSize?: number;
  fontColor?: string;
  position?: 'center' | 'top' | 'bottom';
  backgroundColor?: string;
  fontFile?: string;
}

export interface ComposeOptions {
  outputWidth?: number;
  outputHeight?: number;
  fps?: number;
  videoBitrate?: string;
  audioBitrate?: string;
  preset?: string;
  crf?: number;
  maxDuration?: number;
}

@Injectable()
export class FFmpegService {
  private readonly logger = new Logger(FFmpegService.name);

  constructor(private readonly config: ConfigService) {
    // Set ffmpeg path if configured
    const ffmpegPath = this.config.get<string>('FFMPEG_PATH');
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
    }
  }

  /**
   * Compose video by merging audio and video
   */
  async composeVideo(
    audioPath: string,
    videoPath: string,
    outputPath: string,
    options?: ComposeOptions,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    const opts = {
      outputWidth: options?.outputWidth || 1080,
      outputHeight: options?.outputHeight || 1920,
      fps: options?.fps || 30,
      videoBitrate: options?.videoBitrate || '7000k',
      audioBitrate: options?.audioBitrate || '160k',
      preset: options?.preset || 'fast',
      crf: options?.crf || 20,
      maxDuration: options?.maxDuration || 60,
    };

    this.logger.log(`Composing video: ${path.basename(outputPath)}`);
    this.logger.debug(`Audio: ${audioPath}`);
    this.logger.debug(`Video: ${videoPath}`);
    this.logger.debug(`Options: ${JSON.stringify(opts)}`);

    return new Promise((resolve, reject) => {
      const command = ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(opts.videoBitrate)
        .audioBitrate(opts.audioBitrate)
        .fps(opts.fps)
        .outputOptions([
          `-preset ${opts.preset}`,
          `-crf ${opts.crf}`,
          '-movflags +faststart',
          '-shortest',
        ])
        .videoFilters([
          `scale=${opts.outputWidth}:${opts.outputHeight}:force_original_aspect_ratio=decrease`,
          `pad=${opts.outputWidth}:${opts.outputHeight}:(ow-iw)/2:(oh-ih)/2`,
        ])
        .audioFilters(['aformat=channel_layouts=stereo', 'loudnorm=I=-16:TP=-1.5:LRA=11'])
        .duration(opts.maxDuration)
        .output(outputPath);

      // Track progress
      if (onProgress) {
        command.on('progress', (progress: any) => {
          const percent = progress.percent || 0;
          onProgress(Math.min(percent, 100));
        });
      }

      command
        .on('end', () => {
          this.logger.log(`Video composition complete: ${path.basename(outputPath)}`);
          resolve();
        })
        .on('error', (err: Error, stdout?: string, stderr?: string) => {
          this.logger.error(`FFmpeg error: ${err.message}`);
          if (stdout) this.logger.debug(`FFmpeg stdout: ${stdout}`);
          if (stderr) this.logger.debug(`FFmpeg stderr: ${stderr}`);
          reject(new Error(`Video composition failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Extract a frame from video at specified timestamp
   */
  async extractFrame(videoPath: string, outputPath: string, timestamp?: number): Promise<void> {
    // Default to middle of video if no timestamp provided
    let extractTime = timestamp;

    this.logger.log(`Extracting frame from: ${path.basename(videoPath)}`);

    // If no timestamp, get video duration and extract from middle
    if (extractTime === undefined) {
      try {
        const metadata = await this.getVideoInfo(videoPath);
        extractTime = metadata.duration / 2;
      } catch {
        // Default to 30s if metadata extraction fails
        extractTime = 30;
      }
    }

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(extractTime)
        .frames(1)
        .output(outputPath)
        .on('end', () => {
          this.logger.log(`Frame extracted: ${path.basename(outputPath)}`);
          resolve();
        })
        .on('error', (err: Error) => {
          this.logger.error(`Frame extraction error: ${err.message}`);
          reject(new Error(`Frame extraction failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Scale video/image to target dimensions
   */
  async scaleVideo(
    inputPath: string,
    outputPath: string,
    width: number,
    height: number,
  ): Promise<void> {
    this.logger.log(`Scaling to ${width}x${height}: ${path.basename(inputPath)}`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters([
          `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
          `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=white`,
        ])
        .output(outputPath)
        .on('end', () => {
          this.logger.log(`Scaling complete: ${path.basename(outputPath)}`);
          resolve();
        })
        .on('error', (err: Error) => {
          this.logger.error(`Scaling error: ${err.message}`);
          reject(new Error(`Video scaling failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Add text overlay to video or image
   */
  async addTextOverlay(
    inputPath: string,
    outputPath: string,
    options: TextOverlayOptions,
  ): Promise<void> {
    const {
      text,
      fontSize = 48,
      fontColor = 'white',
      position = 'center',
      backgroundColor = 'black@0.5',
    } = options;

    this.logger.log(`Adding text overlay: ${text}`);

    // Escape special characters in text
    const escapedText = text.replace(/:/g, '\\:').replace(/'/g, "\\'");

    // Calculate position
    const x = '(w-text_w)/2'; // center
    let y = '(h-text_h)/2'; // center

    if (position === 'top') {
      y = '50';
    } else if (position === 'bottom') {
      y = 'h-text_h-50';
    }

    const drawtext = `drawtext=text='${escapedText}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${fontColor}:box=1:boxcolor=${backgroundColor}:boxborderw=10`;

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters([drawtext])
        .output(outputPath)
        .on('end', () => {
          this.logger.log(`Text overlay complete: ${path.basename(outputPath)}`);
          resolve();
        })
        .on('error', (err: Error) => {
          this.logger.error(`Text overlay error: ${err.message}`);
          reject(new Error(`Text overlay failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Get video metadata
   */
  async getVideoInfo(videoPath: string): Promise<VideoMetadata> {
    this.logger.debug(`Getting metadata for: ${path.basename(videoPath)}`);

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          this.logger.error(`Metadata extraction error: ${err.message}`);
          reject(new Error(`Failed to get video info: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');

        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        const info: VideoMetadata = {
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fps: this.parseFps(videoStream.r_frame_rate || '30/1'),
          bitrate: metadata.format.bit_rate || 0,
          codec: videoStream.codec_name || 'unknown',
          hasAudio: !!audioStream,
        };

        this.logger.debug(`Video metadata: ${JSON.stringify(info)}`);
        resolve(info);
      });
    });
  }

  /**
   * Trim audio to specified duration
   */
  async trimAudio(audioPath: string, duration: number): Promise<string> {
    const outputPath = audioPath.replace(/(\.[^.]+)$/, `-trimmed$1`);

    this.logger.log(`Trimming audio to ${duration}s`);

    return new Promise((resolve, reject) => {
      ffmpeg(audioPath)
        .duration(duration)
        .output(outputPath)
        .on('end', () => {
          this.logger.log(`Audio trimmed: ${path.basename(outputPath)}`);
          resolve(outputPath);
        })
        .on('error', (err: Error) => {
          this.logger.error(`Audio trim error: ${err.message}`);
          reject(new Error(`Audio trim failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Pad audio with silence to specified duration
   */
  async padAudio(audioPath: string, targetDuration: number): Promise<string> {
    const outputPath = audioPath.replace(/(\.[^.]+)$/, `-padded$1`);

    this.logger.log(`Padding audio to ${targetDuration}s`);

    const metadata = await this.getVideoInfo(audioPath);
    const silenceDuration = targetDuration - metadata.duration;

    return new Promise((resolve, reject) => {
      ffmpeg(audioPath)
        .input('anullsrc')
        .inputOptions(['-f lavfi', `-t ${silenceDuration}`])
        .complexFilter(['[0:a][1:a]concat=n=2:v=0:a=1[out]'])
        .outputOptions(['-map [out]'])
        .output(outputPath)
        .on('end', () => {
          this.logger.log(`Audio padded: ${path.basename(outputPath)}`);
          resolve(outputPath);
        })
        .on('error', (err: Error) => {
          this.logger.error(`Audio padding error: ${err.message}`);
          reject(new Error(`Audio padding failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Parse frame rate string (e.g., "30/1" -> 30)
   */
  private parseFps(fpsString: string): number {
    const parts = fpsString.split('/');
    if (parts.length === 2) {
      return parseInt(parts[0]) / parseInt(parts[1]);
    }
    return parseFloat(fpsString);
  }

  /**
   * Validate that ffmpeg is available
   */
  async validateFFmpeg(): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.getAvailableFormats((err) => {
        if (err) {
          this.logger.error('FFmpeg not available or not properly configured');
          resolve(false);
        } else {
          this.logger.log('FFmpeg validated successfully');
          resolve(true);
        }
      });
    });
  }
}
