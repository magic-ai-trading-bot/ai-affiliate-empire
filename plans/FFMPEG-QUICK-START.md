# FFmpeg Implementation - Quick Start Guide

**For Developers**: Quick reference for video composition implementation.
**Full Plan**: See `/plans/251101-video-composition-ffmpeg-plan.md`

---

## Quick Commands

### Install FFmpeg

**macOS**:
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian)**:
```bash
apt-get update && apt-get install -y ffmpeg
```

**Docker**:
```dockerfile
FROM node:18-alpine
RUN apk add --no-cache ffmpeg
```

**Verify**:
```bash
ffmpeg -version
ffprobe -version
```

---

## Core FFmpeg Commands

### 1. Compose Video (Audio + Visuals)
```bash
ffmpeg \
  -i voice.mp3 \
  -i visuals.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -r 30 \
  -c:v libx264 -preset fast -crf 20 -b:v 7000k \
  -c:a aac -b:a 160k \
  -af "aformat=channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11" \
  -movflags +faststart \
  -shortest \
  -progress pipe:1 \
  output.mp4
```

**Key Flags**:
- `-i` = Input files
- `-vf` = Video filter (scale, pad)
- `-r 30` = 30 fps output
- `-preset fast` = Speed (fast/medium/slow)
- `-crf 20` = Quality (lower = better, 18-20)
- `-b:v 7000k` = Video bitrate
- `-b:a 160k` = Audio bitrate
- `-af loudnorm` = Audio normalization
- `-shortest` = Stop at shortest stream
- `-progress pipe:1` = Progress output for monitoring

**Output**: 1080x1920 MP4, H.264 + AAC, ~7Mbps, 30fps

---

### 2. Extract Thumbnail Frame
```bash
ffmpeg \
  -i input.mp4 \
  -ss 00:00:30 \
  -vframes 1 \
  output.png
```

**Flags**:
- `-ss 00:00:30` = Seek to 30s mark
- `-vframes 1` = Extract 1 frame only

---

### 3. Add Text Overlay
```bash
ffmpeg \
  -i input.mp4 \
  -vf "drawtext=text='Product Name':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=48:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=5" \
  -c:a copy \
  output.mp4
```

**Text Options**:
- `text='...'` = Text content
- `x=` and `y=` = Position (use `(w-text_w)/2` for center)
- `fontsize=48` = Size in pixels
- `fontcolor=white` = Text color
- `box=1` = Draw background box
- `boxcolor=black@0.5` = Box color + opacity

---

### 4. Get Video Info
```bash
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4
```

**Output**: JSON with duration, resolution, bitrate, codec, etc.

---

### 5. Scale Video to 1024x1024 (Thumbnail)
```bash
ffmpeg \
  -i input.png \
  -vf "scale=1024:1024:force_original_aspect_ratio=decrease,pad=1024:1024:(ow-iw)/2:(oh-ih)/2:color=white" \
  output.png
```

---

## TypeScript Service Template

### FFmpegService Structure
```typescript
@Injectable()
export class FFmpegService {
  constructor(private config: ConfigService) {}

  async composeVideo(
    audioPath: string,
    videoPath: string,
    outputPath: string,
    maxDuration?: number,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    // Build command
    const command = [
      '-i', audioPath,
      '-i', videoPath,
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
      '-r', '30',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '20',
      '-b:v', '7000k',
      '-c:a', 'aac',
      '-b:a', '160k',
      '-af', 'aformat=channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11',
      '-movflags', '+faststart',
      '-shortest',
      '-progress', 'pipe:1',
      outputPath
    ];

    // Execute with child_process or fluent-ffmpeg
    // Parse progress from stdout
    // Handle errors
  }

  async extractFrame(
    videoPath: string,
    outputPath?: string,
    timestamp: number = 30
  ): Promise<string> {
    // Command: ffmpeg -i input.mp4 -ss HH:MM:SS -vframes 1 output.png
  }

  async getVideoInfo(videoPath: string): Promise<VideoMetadata> {
    // Use ffprobe to get: duration, resolution, bitrate, codec
  }
}
```

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Install fluent-ffmpeg: `npm install fluent-ffmpeg`
- [ ] Create FFmpegService
- [ ] Create FileStorageService
- [ ] Create ProgressTrackerService
- [ ] Unit tests (mock ffmpeg)
- [ ] Verify build: `npm run build`

### Phase 2: Composition
- [ ] Update VideoComposerService
- [ ] Implement compose() method
- [ ] Handle audio normalization
- [ ] Add batch processing (p-queue)
- [ ] Integration tests
- [ ] Test with real media files

### Phase 3: Thumbnails
- [ ] Create ThumbnailGeneratorService
- [ ] Implement frame extraction
- [ ] Add text overlay
- [ ] Test thumbnail generation
- [ ] Add DALL-E 3 fallback (Phase 2)

### Phase 4: Error Handling
- [ ] Custom error classes
- [ ] Retry logic
- [ ] Graceful degradation
- [ ] Cleanup on failures

### Phase 5: Testing
- [ ] Unit tests: 85%+ coverage
- [ ] Integration tests: 70%+
- [ ] E2E tests: 60%+
- [ ] Performance tests
- [ ] Full test suite: `npm run test:all`

### Phase 6: Deployment
- [ ] Update Dockerfile
- [ ] Add env variables
- [ ] Docker compose test
- [ ] Write documentation
- [ ] Update README

---

## Testing Quick Reference

### Unit Test Template
```typescript
describe('FFmpegService', () => {
  let service: FFmpegService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [FFmpegService, { provide: ConfigService, useValue: mockConfig }],
    }).compile();
    service = module.get(FFmpegService);
  });

  it('should build compose command', () => {
    const cmd = service.buildComposeCommand(audioPath, videoPath, outputPath);
    expect(cmd).toContain('libx264');
    expect(cmd).toContain('1080x1920');
  });

  it('should parse progress from ffmpeg output', () => {
    const progress = service.parseProgress('frame=150 fps=30 time=00:00:05.00');
    expect(progress).toBe(8); // 5s / 60s * 100
  });

  it('should handle ffmpeg errors', async () => {
    // Mock ffmpeg error
    await expect(service.composeVideo(badAudio, badVideo, output))
      .rejects.toThrow(FFmpegError);
  });
});
```

### Integration Test Template
```typescript
describe('Video Composition Integration', () => {
  it('should compose video end-to-end', async () => {
    const audioPath = 'test/fixtures/audio.mp3';
    const videoPath = 'test/fixtures/video.mp4';
    const outputPath = 'tmp/test-output.mp4';

    await service.composeVideo(audioPath, videoPath, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);

    const info = await service.getVideoInfo(outputPath);
    expect(info.resolution).toEqual({ width: 1080, height: 1920 });
    expect(info.duration).toBeLessThanOrEqual(60);
  });
});
```

---

## Environment Variables

Add to `.env`:
```bash
# FFmpeg
FFMPEG_PATH=/usr/bin/ffmpeg
STORAGE_DIR=/tmp/video
STORAGE_MAX_PARALLEL=5

# Video Output
VIDEO_MAX_DURATION=60
VIDEO_OUTPUT_BITRATE=7000k
VIDEO_AUDIO_BITRATE=160k
VIDEO_FPS=30

# Cloud Storage
AWS_S3_BUCKET=ai-affiliate-videos
AWS_REGION=us-east-1
CDN_BASE_URL=https://cdn.example.com

# Thumbnails
THUMBNAIL_WIDTH=1024
THUMBNAIL_HEIGHT=1024
THUMBNAIL_USE_AI=false
```

---

## Debugging

### Check FFmpeg Installation
```bash
ffmpeg -version
which ffmpeg
```

### Test Compose Command Manually
```bash
ffmpeg -i voice.mp3 -i visuals.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -r 30 -c:v libx264 -preset fast -crf 20 -b:v 7000k \
  -c:a aac -b:a 160k \
  -af "aformat=channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11" \
  -movflags +faststart -shortest -y test_output.mp4
```

### Monitor Progress
```bash
ffmpeg ... -progress pipe:1 2>&1 | grep -E "^(frame|time|progress)"
```

### Extract Video Info
```bash
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4
```

### Test Thumbnail
```bash
ffmpeg -i input.mp4 -ss 00:00:30 -vframes 1 thumb.png
```

---

## Common Issues

### "ffmpeg: command not found"
→ Install ffmpeg binary (see above)

### "Cannot find module 'fluent-ffmpeg'"
→ `npm install fluent-ffmpeg`

### Audio/video sync issues
→ Use `-shortest` flag to stop at shorter stream

### File too large
→ Reduce bitrate: `-b:v 5000k` instead of 7000k

### Process timeout
→ Use faster preset: `-preset ultrafast` (lower quality)

### "Unable to write file" permission error
→ Check temp directory permissions: `chmod 755 /tmp/video`

### Memory exhaustion with 5 parallel
→ Reduce concurrency: `max: 3`

---

## Performance Tips

1. **Faster encoding**: Use `-preset ultrafast` (trades quality)
2. **Smaller files**: Reduce `-crf` to 23-28 (more compression)
3. **Hardware acceleration**: Add `-hwaccel cuvid` (NVIDIA) or `-hwaccel videotoolbox` (Mac)
4. **Memory**: Use `-threads 2` to limit threads per process
5. **Disk**: Use SSD for temp directory, not HDD

---

## Resources

- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [FFmpeg Filters](https://ffmpeg.org/ffmpeg-filters.html)
- [fluent-ffmpeg Docs](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)
- [YouTube Shorts Specs](https://support.google.com/youtube/answer/9059808)
- [TikTok Video Specs](https://creators.tiktok.com/creator/upload)
- [Instagram Reels Specs](https://help.instagram.com/587016755581255)

---

**Next Steps**: Follow implementation plan in `/plans/251101-video-composition-ffmpeg-plan.md`
