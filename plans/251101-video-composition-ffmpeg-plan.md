# Video Composition with FFmpeg - Implementation Plan

**Date Created**: 2025-11-01
**Priority**: Critical (Blocks autonomous operation)
**Effort Estimate**: 20-40 hours
**Target Duration**: 7-10 days
**Team**: Development Team
**Status**: Ready for Implementation

---

## Overview

Implement complete video composition pipeline using FFmpeg to combine voice audio (ElevenLabs) + video visuals (Pika Labs) into final MP4 files optimized for social media (YouTube Shorts, TikTok, Instagram Reels). Currently, video-composer.service.ts has TODO stubs. This plan provides end-to-end implementation strategy with ffmpeg command optimization, file handling, progress tracking, and error recovery.

**Scope**:
- Final video composition (audio + visuals merge)
- Thumbnail generation (1024x1024 PNG)
- Caption/subtitle overlay (optional - Phase 2)
- Watermark text overlay (optional - Phase 2)
- Progress monitoring during encoding
- Error handling & recovery
- Batch processing support (5 parallel streams)
- Temporary file cleanup

**Success Criteria**:
- ✅ Generate valid MP4 files (1080x1920, 9:16, ≤60s)
- ✅ Audio synced with visuals (0.1s tolerance)
- ✅ Thumbnail 1024x1024 PNG with text
- ✅ Process 5 videos in parallel
- ✅ <2% failure rate
- ✅ Comprehensive error handling
- ✅ 80%+ test coverage

---

## Requirements

### Functional Requirements

1. **Video Composition**
   - Merge audio (MP3 from ElevenLabs) with video (MP4 from Pika Labs)
   - Output: H.264 video, AAC audio (128-160 kbps)
   - Resolution: 1080x1920 (9:16 aspect ratio)
   - Duration: ≤60 seconds (trim if needed)
   - Frame rate: 30 fps
   - Bitrate: 5-8 Mbps

2. **Thumbnail Generation**
   - Extract frame from middle of video OR use DALL-E 3
   - Dimensions: 1024x1024 PNG
   - Add text overlay: product title + "Best Buy Now"
   - Font: Arial/Helvetica, white, 48pt
   - Background: gradient or solid color
   - Fast generation (<5s)

3. **Batch Processing**
   - Process up to 5 videos in parallel
   - Queue system for larger batches
   - Progress tracking per video
   - Partial failure handling (continue on single failure)

4. **Progress Monitoring**
   - Emit progress events (0-100%)
   - Track processing stage (downloading, merging, encoding, uploading)
   - Estimate time remaining
   - Log detailed metrics

5. **Error Recovery**
   - Graceful degradation (skip thumbnails, use fallback)
   - Retry logic with exponential backoff
   - Temporary file cleanup on failure
   - Detailed error logging

### Non-Functional Requirements

1. **Performance**
   - Composition: <30s per video (H.264 fast preset)
   - Thumbnail: <5s per image
   - Memory: <500MB per parallel process
   - Disk: 2GB temp space (for 5 parallel + buffers)

2. **Reliability**
   - 99% success rate for valid inputs
   - Automatic cleanup of partial files
   - Database transaction consistency
   - Graceful handling of missing sources

3. **Maintainability**
   - Type-safe (no `any` types)
   - Comprehensive error classes
   - Structured logging
   - Unit tested (>80% coverage)
   - Clear dependency injection

4. **Security**
   - Validate input URLs (whitelist protocols)
   - Sanitize file paths
   - Prevent path traversal
   - Limit file sizes (max 2GB)
   - Secure temp file handling

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│ Video Service (Orchestration)                               │
│ src/modules/video/video.service.ts                          │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┬──────────────────┐
    │                         │                  │
    v                         v                  v
┌──────────────┐    ┌──────────────────┐   ┌─────────────┐
│ ElevenLabs   │    │ Pika Labs        │   │ Composer    │
│ (Audio)      │    │ (Visuals)        │   │ (FFmpeg)    │
└──────────────┘    └──────────────────┘   └──────┬──────┘
                                                    │
                          ┌─────────────────────────┴────────────────────┐
                          │                                              │
                ┌─────────v─────────┐                        ┌──────────v──────────┐
                │ FFmpeg Binary     │                        │ Thumbnail Generator│
                │ video composition │                        │ (FFmpeg + Fontify) │
                └───────────────────┘                        └────────────────────┘
                          │
                ┌─────────v───────────────────────────┐
                │ Storage (S3/CDN/Local)              │
                │ - MP4 files                         │
                │ - PNG thumbnails                    │
                │ - Temp files (cleaned up)           │
                └─────────────────────────────────────┘
```

### Component Breakdown

#### 1. **VideoComposerService** (Main Orchestrator)
**File**: `src/modules/video/services/video-composer.service.ts`

```typescript
interface VideoCompositionParams {
  voiceUrl: string;          // MP3 from ElevenLabs
  visualsUrl: string;        // MP4 from Pika Labs
  script: string;            // Video script (for captions)
  product: ProductDto;       // Product info
  outputDir?: string;        // Temp output directory
}

interface ThumbnailParams {
  videoUrl: string;
  productTitle: string;
  outputDir?: string;
}

interface ProgressEvent {
  stage: 'downloading' | 'merging' | 'encoding' | 'uploading';
  progress: number;          // 0-100
  estimatedSeconds: number;
  videoId: string;
}

@Injectable()
export class VideoComposerService {
  // Responsibilities:
  // 1. Download source files
  // 2. Compose video with FFmpeg
  // 3. Validate output
  // 4. Generate thumbnail
  // 5. Upload to storage
  // 6. Cleanup temp files
  // 7. Track progress
  // 8. Handle errors with recovery
}
```

#### 2. **FFmpegService** (FFmpeg Wrapper)
**File**: `src/modules/video/services/ffmpeg.service.ts` (NEW)

Wraps FFmpeg binary with clean TypeScript interface:

```typescript
@Injectable()
export class FFmpegService {
  // Compose: Merge audio + video
  async composeVideo(
    audioPath: string,
    videoPath: string,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<void>

  // Extract: Get frame from video
  async extractFrame(
    videoPath: string,
    outputPath: string,
    timestamp?: number
  ): Promise<void>

  // Scale: Resize to target dimensions
  async scaleVideo(
    inputPath: string,
    outputPath: string,
    width: number,
    height: number
  ): Promise<void>

  // AddText: Burn text overlay
  async addTextOverlay(
    inputPath: string,
    outputPath: string,
    text: string,
    options: TextOverlayOptions
  ): Promise<void>

  // GetInfo: Extract video metadata
  async getVideoInfo(videoPath: string): Promise<VideoMetadata>
}
```

#### 3. **FileStorageService** (File Management)
**File**: `src/modules/video/services/file-storage.service.ts` (NEW)

Manages downloads, uploads, temp files:

```typescript
@Injectable()
export class FileStorageService {
  // Download: Fetch remote file to local temp
  async downloadFile(
    url: string,
    filename?: string,
    maxSize?: number
  ): Promise<string>

  // Upload: Move local file to storage (S3/CDN)
  async uploadFile(
    localPath: string,
    remotePath: string,
    contentType: string
  ): Promise<string>  // Returns CDN URL

  // Cleanup: Remove temp files
  async cleanupTempFile(filepath: string): Promise<void>

  // Validate: Check file type & size
  validateFile(filepath: string, expectedType: string): boolean
}
```

#### 4. **ThumbnailGeneratorService** (Image Creation)
**File**: `src/modules/video/services/thumbnail-generator.service.ts` (NEW)

```typescript
interface ThumbnailOptions {
  productTitle: string;
  resolution: { width: number; height: number };
  backgroundColor?: string;
  textColor?: string;
  fontSizePt?: number;
}

@Injectable()
export class ThumbnailGeneratorService {
  // Generate: Extract frame + add text
  async generateFromVideo(
    videoPath: string,
    options: ThumbnailOptions
  ): Promise<string>  // Returns local PNG path

  // GenerateAI: Use DALL-E 3 for custom thumbnail
  async generateAI(
    productTitle: string,
    productDescription: string,
    options: ThumbnailOptions
  ): Promise<string>
}
```

#### 5. **ProgressTracker** (Event Emitter)
**File**: `src/modules/video/services/progress-tracker.service.ts` (NEW)

```typescript
@Injectable()
export class ProgressTrackerService {
  // Emit events for real-time progress
  onProgress(
    videoId: string,
    stage: string,
    progress: number,
    estimatedSeconds: number
  ): void

  // Subscribe to progress events
  subscribe(videoId: string): Observable<ProgressEvent>
}
```

### FFmpeg Command Strategy

#### Composition Command
```bash
# Download and merge audio + video
# Handle audio shorter than video: pad with silence
# Handle audio longer than video: trim
# Normalize volume to -3dB
# Output: 1080x1920, 30fps, 6-8 Mbps

ffmpeg \
  -i voice.mp3 \
  -i visuals.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -r 30 \
  -c:v libx264 \
  -preset fast \
  -crf 20 \
  -b:v 7000k \
  -c:a aac \
  -b:a 160k \
  -af "aformat=channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11" \
  -movflags +faststart \
  -shortest \
  -y \
  output.mp4
```

**Parameter Explanations**:
- `-vf scale=...` → Scale to 1080x1920 (9:16) with black letterbox
- `-r 30` → Force 30fps output
- `-preset fast` → Faster encoding (slower = smaller file)
- `-crf 20` → Quality (lower = better, 18-20 for social media)
- `-b:v 7000k` → Video bitrate (~7 Mbps for social media)
- `-b:a 160k` → Audio bitrate (good quality)
- `-af loudnorm` → Normalize audio volume to platform standard
- `-movflags +faststart` → Enable progressive download
- `-shortest` → Stop at shortest stream (prevent silence padding)

#### Thumbnail Extraction
```bash
# Extract frame from middle of video
# Add text overlay with product name
# Output: 1024x1024 PNG

ffmpeg \
  -i input.mp4 \
  -ss 00:00:30 \
  -vframes 1 \
  -vf "scale=1024:1024:force_original_aspect_ratio=decrease,
        pad=1024:1024:(ow-iw)/2:(oh-ih)/2:color=white,
        drawtext=text='${TITLE}':x=(w-text_w)/2:y=(h-text_h)/2:
        fontfile=/path/to/font.ttf:fontsize=48:fontcolor=white:
        box=1:boxcolor=black@0.5:boxborderw=5" \
  -y output.png
```

**Strategy**:
- Extract frame at 30s mark (middle of 60s video)
- Scale to 1024x1024 with white padding
- Draw centered white text with black background box
- Use custom font if available, fallback to system default

---

## Implementation Steps

### Phase 1: Foundation (Days 1-2) - ~6-8 hours

#### Step 1.1: Install FFmpeg Binary & Create Wrapper
**File**: `src/modules/video/services/ffmpeg.service.ts`

- Create `FFmpegService` with child process execution
- Implement type-safe wrapper around ffmpeg CLI
- Handle stdout/stderr parsing for progress
- Add error code mapping to meaningful exceptions
- Create custom error classes: `FFmpegError`, `VideoCompositionError`

**Tasks**:
- [ ] Add `fluent-ffmpeg` OR `@ffmpeg/ffmpeg` package (lightweight wrapper)
- [ ] Create FFmpegService with methods: `composeVideo()`, `extractFrame()`, `getVideoInfo()`
- [ ] Implement progress event emitter (parse ffmpeg output)
- [ ] Add timeout handling (60s max per video)
- [ ] Unit tests: FFmpegService (basic command generation)

**Dependencies to Add**:
```json
{
  "fluent-ffmpeg": "^2.1.3",
  "@types/fluent-ffmpeg": "^2.1.8"
}
```

**Alternative**: Use `child_process` + parse ffmpeg output (heavier but more control)

#### Step 1.2: Create File Storage Service
**File**: `src/modules/video/services/file-storage.service.ts`

- Download remote files (with size validation)
- Upload local files to S3/CDN
- Cleanup temp files
- File validation (type, size, integrity)

**Tasks**:
- [ ] Implement `downloadFile()` with retry logic
- [ ] Implement `uploadFile()` for S3 integration
- [ ] Create temp directory management
- [ ] Add file size validation (max 2GB)
- [ ] Add cleanup scheduler (remove files >1 hour old)
- [ ] Unit tests: FileStorageService

#### Step 1.3: Create Progress Tracker
**File**: `src/modules/video/services/progress-tracker.service.ts`

- Event emitter for real-time progress
- Track stage transitions
- Estimate time remaining
- Store progress history

**Tasks**:
- [ ] Implement `onProgress()` event emitter
- [ ] Create Observable-based subscriber
- [ ] Add progress history storage (in-memory cache)
- [ ] Implement timeout detection (no progress >30s)
- [ ] Unit tests: ProgressTrackerService

---

### Phase 2: Video Composition (Days 2-4) - ~12-16 hours

#### Step 2.1: Implement Video Composition Core
**File**: `src/modules/video/services/video-composer.service.ts` (Update)

Replace TODO stubs with real implementation:

```typescript
async compose(params: VideoCompositionParams): Promise<string> {
  const { voiceUrl, visualsUrl, product } = params;
  const videoId = params.product.id;

  try {
    // Step 1: Download source files
    const voicePath = await this.fileStorage.downloadFile(voiceUrl);
    const visualsPath = await this.fileStorage.downloadFile(visualsUrl);

    // Step 2: Validate inputs
    this.validateSources(voicePath, visualsPath);

    // Step 3: Get metadata
    const videoInfo = await this.ffmpeg.getVideoInfo(visualsPath);
    const trimmedDuration = Math.min(videoInfo.duration, 60);

    // Step 4: Compose with FFmpeg
    const outputPath = this.getTempPath(`composed-${videoId}.mp4`);
    await this.ffmpeg.composeVideo(
      voicePath,
      visualsPath,
      outputPath,
      trimmedDuration,
      (progress) => this.progressTracker.onProgress(videoId, 'encoding', progress)
    );

    // Step 5: Upload result
    const cdnUrl = await this.fileStorage.uploadFile(
      outputPath,
      `videos/composed/${videoId}.mp4`,
      'video/mp4'
    );

    // Step 6: Cleanup
    await Promise.all([
      this.fileStorage.cleanupTempFile(voicePath),
      this.fileStorage.cleanupTempFile(visualsPath),
      this.fileStorage.cleanupTempFile(outputPath),
    ]);

    return cdnUrl;
  } catch (error) {
    await this.handleCompositionError(videoId, error);
    throw;
  }
}
```

**Tasks**:
- [ ] Implement `compose()` method
- [ ] Add source file validation
- [ ] Handle audio/video duration mismatch
- [ ] Add FFmpeg progress tracking
- [ ] Implement error recovery (fallback URLs)
- [ ] Add database updates (video status)
- [ ] Integration tests: Composition workflow

#### Step 2.2: Audio/Video Synchronization
Handle edge cases:

- Audio shorter than video: Pad with silence
- Audio longer than video: Trim to video duration
- No audio: Use silent AAC track
- Mismatched frame rates: Normalize to 30fps

**Implementation**:
```typescript
private async normalizeAudioDuration(
  audioPath: string,
  targetDuration: number
): Promise<string> {
  const audioInfo = await this.ffmpeg.getVideoInfo(audioPath);

  if (audioInfo.duration > targetDuration) {
    // Trim audio
    return this.ffmpeg.trimAudio(audioPath, targetDuration);
  } else if (audioInfo.duration < targetDuration) {
    // Pad with silence
    return this.ffmpeg.padAudio(audioPath, targetDuration);
  }

  return audioPath;
}
```

**Tasks**:
- [ ] Implement audio duration normalization
- [ ] Add silence padding function
- [ ] Handle codec mismatches
- [ ] Unit tests: Audio normalization

#### Step 2.3: Batch Processing Support
Enable 5 parallel video compositions:

**Implementation**:
```typescript
async composeBatch(
  videoDtos: VideoCompositionParams[],
  concurrency: number = 5
): Promise<CompositionResult[]> {
  // Use p-queue or Promise.allSettled for controlled concurrency
  const queue = new PQueue({ concurrency });

  return Promise.allSettled(
    videoDtos.map(dto =>
      queue.add(() => this.compose(dto))
    )
  );
}
```

**Tasks**:
- [ ] Implement concurrent composition queue
- [ ] Add concurrency limit (5 parallel)
- [ ] Track individual progress per video
- [ ] Handle partial failures (continue on error)
- [ ] Add memory/disk monitoring
- [ ] Integration tests: Batch processing

---

### Phase 3: Thumbnail Generation (Days 4-5) - ~6-8 hours

#### Step 3.1: Implement Thumbnail Generator
**File**: `src/modules/video/services/thumbnail-generator.service.ts`

```typescript
async generateFromVideo(
  videoPath: string,
  options: ThumbnailOptions
): Promise<string> {
  // Step 1: Extract frame from middle
  const framePath = await this.ffmpeg.extractFrame(
    videoPath,
    undefined,  // timestamp (use default: middle)
  );

  // Step 2: Add text overlay
  const textPath = await this.ffmpeg.addTextOverlay(
    framePath,
    {
      text: options.productTitle,
      fontSize: 48,
      color: 'white',
      position: 'center',
    }
  );

  // Step 3: Scale to 1024x1024
  const outputPath = this.getTempPath(`thumb-${Date.now()}.png`);
  await this.ffmpeg.scaleVideo(textPath, outputPath, 1024, 1024);

  // Step 4: Upload and cleanup
  const cdnUrl = await this.fileStorage.uploadFile(
    outputPath,
    `thumbnails/${options.productTitle}.png`,
    'image/png'
  );

  await this.fileStorage.cleanupTempFile(framePath);
  await this.fileStorage.cleanupTempFile(textPath);
  await this.fileStorage.cleanupTempFile(outputPath);

  return cdnUrl;
}
```

**Tasks**:
- [ ] Implement frame extraction
- [ ] Add text overlay with font rendering
- [ ] Implement image scaling/padding
- [ ] Handle fallback to placeholder if video corrupted
- [ ] Add caching (thumbnails already generated)
- [ ] Unit tests: Thumbnail generation

#### Step 3.2: Optional: AI Thumbnail Generation
Fallback to DALL-E 3 if frame extraction fails:

```typescript
async generateAI(
  productTitle: string,
  productDescription: string,
  options: ThumbnailOptions
): Promise<string> {
  // Use OpenAI DALL-E 3 API
  const prompt = `Create an eye-catching thumbnail for "${productTitle}".
    Description: ${productDescription}.
    Style: modern, professional, vibrant.
    Text overlay: "Best Buy Now".
    Aspect ratio: square 1:1`;

  // Call OpenAI DALL-E 3 service (already in codebase)
  return this.openaiService.generateImage(prompt, {
    size: '1024x1024',
    quality: 'hd',
  });
}
```

**Tasks** (Optional - Phase 2):
- [ ] Integrate with OpenAI DALL-E 3 service
- [ ] Create fallback chain: extract frame → add text → if failed → generate AI
- [ ] Cache AI thumbnails
- [ ] Unit tests: AI generation

---

### Phase 4: Error Handling & Recovery (Days 5-6) - ~6-8 hours

#### Step 4.1: Implement Comprehensive Error Handling
**File**: `src/common/exceptions/video-composition.error.ts`

```typescript
export class VideoCompositionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>,
    public readonly recoverable: boolean = false,
  ) {
    super(message);
    this.name = 'VideoCompositionError';
  }
}

export const VideoErrorCodes = {
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  INVALID_SOURCE: 'INVALID_SOURCE',
  COMPOSITION_FAILED: 'COMPOSITION_FAILED',
  TIMEOUT: 'TIMEOUT',
  DISK_FULL: 'DISK_FULL',
  INVALID_OUTPUT: 'INVALID_OUTPUT',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
};
```

**Tasks**:
- [ ] Create custom error classes
- [ ] Implement error mapping (FFmpeg errors → meaningful messages)
- [ ] Add context tracking (product ID, file sizes, etc.)
- [ ] Unit tests: Error handling

#### Step 4.2: Implement Retry Logic
```typescript
async composeWithRetry(
  params: VideoCompositionParams,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<string> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.compose(params);
    } catch (error) {
      lastError = error;

      if (!this.isRecoverable(error)) {
        throw error;  // Don't retry non-recoverable errors
      }

      if (attempt < maxRetries) {
        const delay = backoffMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

**Tasks**:
- [ ] Implement exponential backoff retry
- [ ] Distinguish recoverable vs fatal errors
- [ ] Add retry logging
- [ ] Unit tests: Retry logic

#### Step 4.3: Graceful Degradation
- If thumbnail generation fails: Use placeholder
- If video composition fails: Return original visual URL + log error
- If upload fails: Store locally + retry async

**Tasks**:
- [ ] Implement fallback strategies
- [ ] Add async retry queues for uploads
- [ ] Implement circuit breaker for FFmpeg
- [ ] Unit tests: Degradation scenarios

---

### Phase 5: Testing & Validation (Days 6-7) - ~8-10 hours

#### Step 5.1: Unit Tests
**File**: `test/unit/video/video-composer.service.spec.ts`

Test coverage targets:
- FFmpegService: 85%+ (command generation, output parsing)
- FileStorageService: 80%+ (download, upload, cleanup)
- ProgressTrackerService: 85%+ (event emission)
- VideoComposerService: 85%+ (composition flow, error handling)
- ThumbnailGeneratorService: 80%+ (frame extraction, text overlay)

**Key Test Scenarios**:
```typescript
describe('VideoComposerService', () => {
  describe('compose()', () => {
    it('should compose video with valid audio+video', async () => {
      // Test normal flow
    });

    it('should handle audio shorter than video', async () => {
      // Test padding with silence
    });

    it('should trim audio longer than video', async () => {
      // Test trimming
    });

    it('should fail gracefully on invalid source', async () => {
      // Test error handling
    });

    it('should cleanup temp files on error', async () => {
      // Test cleanup
    });

    it('should emit progress events', async () => {
      // Test progress tracking
    });
  });

  describe('generateThumbnail()', () => {
    it('should extract and scale frame', async () => {});
    it('should add text overlay', async () => {});
    it('should fallback to placeholder on error', async () => {});
  });

  describe('composeBatch()', () => {
    it('should process 5 videos in parallel', async () => {});
    it('should continue on partial failure', async () => {});
  });
});
```

**Tasks**:
- [ ] Write unit tests for all services (80%+ coverage)
- [ ] Mock FFmpeg output/errors
- [ ] Test edge cases (duration mismatches, corrupted files)
- [ ] Test error recovery
- [ ] Run `npm run test:unit` and verify coverage

#### Step 5.2: Integration Tests
**File**: `test/integration/video/video-composition.integration.spec.ts`

```typescript
describe('Video Composition Integration', () => {
  it('should compose video end-to-end', async () => {
    // Create test video, use real ElevenLabs + Pika Labs mocks
    // Call VideoService.generateVideo()
    // Verify output MP4 validity
    // Check database updates
  });

  it('should generate valid thumbnail', async () => {
    // Create test video
    // Generate thumbnail
    // Verify PNG dimensions & validity
  });

  it('should handle batch processing', async () => {
    // Create 5 test videos
    // Call composeBatch()
    // Verify all complete or handle failures
  });

  it('should cleanup temp files', async () => {
    // Run composition
    // Verify temp directory empty after
  });
});
```

**Tasks**:
- [ ] Write integration tests
- [ ] Mock external services (S3, DALL-E)
- [ ] Use test containers for ffmpeg
- [ ] Run `npm run test:integration` and verify success

#### Step 5.3: Performance Testing
- Benchmark single composition: Target <30s
- Benchmark thumbnail: Target <5s
- Memory profiling: Ensure <500MB per process
- Disk usage: Verify cleanup works

**Tasks**:
- [ ] Add performance benchmarks
- [ ] Profile memory usage
- [ ] Test concurrent processing (load test)
- [ ] Document performance metrics

#### Step 5.4: E2E Testing
**File**: `test/e2e/video.e2e-spec.ts`

```typescript
describe('Video API (E2E)', () => {
  it('POST /videos should generate complete video', async () => {
    const response = await request(app.getHttpServer())
      .post('/videos')
      .send({
        productId: 'test-product',
        script: 'Test script...',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('videoUrl');
    expect(response.body).toHaveProperty('thumbnailUrl');
    expect(response.body.status).toBe('READY');
  });

  it('should track progress in real-time', async () => {
    // Subscribe to WebSocket progress events
    // Generate video
    // Verify progress updates received
  });
});
```

**Tasks**:
- [ ] Write E2E tests
- [ ] Test actual API endpoints
- [ ] Verify database persistence
- [ ] Run `npm run test:e2e` and verify success

---

### Phase 6: Deployment & Documentation (Days 7-10) - ~4-6 hours

#### Step 6.1: Docker & Production Setup

**Tasks**:
- [ ] Update Dockerfile to install ffmpeg binary
- [ ] Configure environment variables for storage (S3/CDN)
- [ ] Test Docker build locally
- [ ] Verify temp directory permissions in container

#### Step 6.2: Environment Configuration
Add to `.env.example`:

```bash
# Video Composition
FFMPEG_PATH=/usr/bin/ffmpeg          # Path to ffmpeg binary
STORAGE_DIR=/tmp/video               # Temp storage
STORAGE_MAX_PARALLEL=5               # Concurrent compositions
VIDEO_MAX_DURATION=60                # Max video length (seconds)
VIDEO_OUTPUT_BITRATE=7000k           # Video bitrate
VIDEO_AUDIO_BITRATE=160k             # Audio bitrate
VIDEO_FPS=30                         # Frame rate

# Cloud Storage (S3/CDN)
AWS_S3_BUCKET=ai-affiliate-videos
AWS_REGION=us-east-1
CDN_BASE_URL=https://cdn.example.com

# Thumbnail Generation
THUMBNAIL_WIDTH=1024
THUMBNAIL_HEIGHT=1024
THUMBNAIL_USE_AI=false               # Use DALL-E 3 as fallback
```

**Tasks**:
- [ ] Add env vars to `.env.example`
- [ ] Create validation schema for config
- [ ] Update docker-compose.yml
- [ ] Document setup requirements

#### Step 6.3: Documentation Updates
**File**: `docs/video-composition-guide.md` (NEW)

Create comprehensive guide:
- Installation requirements (ffmpeg binary)
- Configuration guide
- API reference
- Error codes & recovery
- Performance tuning
- Troubleshooting

**Tasks**:
- [ ] Write setup guide
- [ ] Document FFmpeg commands
- [ ] Create troubleshooting section
- [ ] Add performance tuning tips

#### Step 6.4: Codebase Summary Update
**File**: `docs/codebase-summary.md`

Update Video Module section:
- Mark composition as ✅ IMPLEMENTED
- Document new services
- Update architecture diagram
- Note batch processing capability

**Tasks**:
- [ ] Update codebase-summary.md
- [ ] Mark tests as complete
- [ ] Update implementation status

---

## Files to Modify/Create/Delete

### Files to CREATE

1. **`src/modules/video/services/ffmpeg.service.ts`** (NEW - ~250 lines)
   - FFmpeg wrapper with type-safe interface
   - Command builders for composition, scaling, text overlay
   - Progress parsing from ffmpeg output
   - Error handling & code mapping

2. **`src/modules/video/services/file-storage.service.ts`** (NEW - ~200 lines)
   - Download remote files with retry
   - Upload to S3/CDN
   - Temp file management
   - File validation

3. **`src/modules/video/services/progress-tracker.service.ts`** (NEW - ~120 lines)
   - Event emitter for progress
   - Observable subscription pattern
   - Progress history tracking
   - Timeout detection

4. **`src/modules/video/services/thumbnail-generator.service.ts`** (NEW - ~180 lines)
   - Frame extraction
   - Text overlay rendering
   - Image scaling/padding
   - AI fallback (DALL-E 3)

5. **`src/common/exceptions/video-composition.error.ts`** (NEW - ~50 lines)
   - Custom error classes
   - Error codes enum
   - Error mapping utilities

6. **`test/unit/video/video-composer.service.spec.ts`** (NEW - ~400 lines)
   - Composition unit tests
   - Mock FFmpeg/storage
   - Edge case coverage

7. **`test/integration/video/video-composition.integration.spec.ts`** (NEW - ~300 lines)
   - End-to-end integration tests
   - Real service interaction
   - Database validation

8. **`docs/video-composition-guide.md`** (NEW - ~200 lines)
   - Setup instructions
   - API documentation
   - Troubleshooting guide

### Files to UPDATE

1. **`src/modules/video/services/video-composer.service.ts`**
   - Replace TODO stubs with real implementation
   - ~80 lines of new code
   - Add composition, thumbnail generation, batch processing

2. **`src/modules/video/video.service.ts`**
   - Inject new services (FFmpeg, FileStorage, ProgressTracker)
   - Update progress event emission
   - Add batch processing endpoint (~20 new lines)

3. **`src/modules/video/video.controller.ts`**
   - Add batch composition endpoint
   - Add progress WebSocket endpoint
   - Add thumbnail regeneration endpoint

4. **`src/modules/video/video.module.ts`**
   - Register new services in providers
   - Add dependencies (P-Queue, fluent-ffmpeg)

5. **`src/modules/video/dto/generate-video.dto.ts`**
   - Add batch composition DTO
   - Add progress tracking DTO

6. **`docs/codebase-summary.md`**
   - Update Video Module status (✅ IMPLEMENTED)
   - Add new services to architecture

7. **`package.json`**
   - Add `fluent-ffmpeg` (or alternatives)
   - Add `p-queue` for concurrency
   - Add `sharp` for image manipulation (optional)

### Files to DELETE

None - All changes are additive/update existing

---

## Technology Stack & Dependencies

### Required

1. **fluent-ffmpeg** (v2.1.3+)
   - Lightweight FFmpeg wrapper for Node.js
   - Handles process spawning, output parsing
   - Cross-platform compatibility
   - Alternative: Use child_process directly (more control, more code)

2. **p-queue** (v7.3.0+)
   - Concurrency control for parallel video processing
   - Supports priority queues
   - Memory efficient

3. **sharp** (v0.32.0+) - OPTIONAL
   - Image processing (faster alternative to FFmpeg for thumbnails)
   - For PNG encoding, text rendering
   - If not used, rely on FFmpeg only

### System Requirements

- **FFmpeg Binary** (v4.4+)
  - Linux: `apt-get install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Windows: Download from ffmpeg.org
  - Docker: Already included in builder stage

- **Disk Space**: 2-5GB for temp files (5 parallel compositions)
- **Memory**: 2GB RAM minimum (500MB per parallel process)
- **CPU**: Modern multi-core for faster encoding

---

## Testing Strategy

### Unit Test Coverage: 85%+

**Files to Test**:
- `ffmpeg.service.ts` - Command generation, error mapping
- `file-storage.service.ts` - Upload/download logic
- `progress-tracker.service.ts` - Event emission
- `video-composer.service.ts` - Composition flow
- `thumbnail-generator.service.ts` - Frame extraction

**Test Approach**:
- Mock FFmpeg child process
- Mock S3/file system
- Mock Observable subscribers
- Test error scenarios
- Test edge cases (audio duration mismatch, etc.)

### Integration Test Coverage: 70%+

**Scenarios**:
- Full video composition workflow
- Thumbnail generation with real FFmpeg
- Batch processing of 5 videos
- Error recovery and cleanup
- Database persistence

### E2E Test Coverage: 60%+

**Scenarios**:
- API endpoint: `POST /videos` generates complete video
- API endpoint: `POST /videos/batch` processes multiple
- WebSocket: Real-time progress tracking
- Database: Video records updated correctly

### Performance Testing

**Targets**:
- Single composition: <30s (fast preset)
- Thumbnail generation: <5s
- Batch (5 parallel): <35s
- Memory per process: <500MB
- Temp disk usage: <2GB

**Tools**:
- Jest benchmarks
- Node.js profiler
- Load testing with K6

---

## Security Considerations

### Input Validation
- Validate URLs (whitelist HTTPS/HTTP)
- Validate file types (verify MIME type)
- Validate file sizes (max 2GB per file)
- Validate output paths (prevent directory traversal)

### File Handling
- Use secure temp directory (`/tmp` with random names)
- Cleanup temp files immediately after use
- Don't expose file paths in API responses
- Use CDN URLs instead of direct file access

### Process Security
- Run ffmpeg process with limited privileges
- Set resource limits (CPU, memory, timeout)
- Kill processes that exceed time limit
- Log all failures for audit

### Data Privacy
- Don't log sensitive data (API keys, file paths)
- Encrypt uploaded files in S3
- Use signed URLs with expiration for CDN links
- Implement rate limiting on composition endpoints

---

## Error Handling & Recovery

### Error Categories

**Recoverable Errors** (Retry with backoff):
- Network timeouts
- S3 upload failures
- Temporary disk full
- Rate limit exceeded

**Permanent Errors** (Fail fast):
- Invalid source format
- Corrupted files
- Unsupported codec
- Missing required fields

**Timeout Handling**:
- FFmpeg process: 60s timeout
- File download: 30s timeout
- S3 upload: 60s timeout
- Set SIGTERM on timeout, cleanup temp files

### Recovery Strategies

1. **Retry with Exponential Backoff**
   ```
   Attempt 1: Immediate
   Attempt 2: Wait 1s
   Attempt 3: Wait 2s
   Attempt 4: Wait 4s
   Max: 3 attempts
   ```

2. **Graceful Degradation**
   - Thumbnail fails → Use placeholder
   - Composition fails → Return visual URL
   - Upload fails → Store locally, retry async

3. **Cleanup on Failure**
   - Always cleanup temp files
   - Update database status (FAILED)
   - Log detailed error context
   - Emit failure event for monitoring

---

## Performance Optimization

### FFmpeg Tuning

**Preset Trade-offs**:
```
faster  → 10s encode, larger file
fast    → 20s encode, medium file (recommended)
medium  → 30s encode, smaller file
slow    → 45s encode, smallest file
```

**Bitrate Optimization**:
- CRF 18-20: High quality (~7Mbps for 1080x1920)
- CRF 20-23: Medium quality (~5Mbps)
- CRF 24+: Lower quality (<3Mbps)

**Parallel Processing**:
- Limit to 5 concurrent compositions
- Each uses ~1 CPU core
- Monitor disk I/O (bottleneck on HDDs)
- Use SSD for temp directory

### Memory Management

- Streaming approach: Don't load full files in memory
- Cleanup temp files immediately after use
- Monitor for memory leaks in progress tracking
- Profile with Node.js `--inspect`

### Disk Usage

- Temp directory: 2-5GB for 5 parallel
- Source files: 100-500MB each
- Output files: 50-200MB each
- Implement cleanup scheduler (remove >1h old files)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| FFmpeg not installed | HIGH | Document install, provide Docker image, verify in health check |
| Audio/video sync issues | HIGH | Test with various durations, implement auto-padding, add QA validation |
| Disk full during encoding | HIGH | Pre-check disk space, set file size limits, cleanup aggressively |
| Memory exhaustion (5 parallel) | MEDIUM | Monitor memory usage, limit processes if high, implement queue |
| S3 upload timeouts | MEDIUM | Implement retry, support local fallback, use multipart upload |
| Corrupted output files | MEDIUM | Validate output with ffprobe, delete invalid files, log errors |
| Progress tracking stalls | LOW | Implement timeout, detect hanging processes, kill + retry |
| File permission issues | MEDIUM | Use consistent temp directory, set proper permissions, handle in Docker |

---

## Success Metrics

### Functional Metrics
- ✅ 99%+ videos successfully composed
- ✅ Audio/video sync <0.1s drift
- ✅ Thumbnail generated for 95%+ videos
- ✅ Batch processing handles 5 parallel without failure
- ✅ Temp files cleanup 100% after completion

### Performance Metrics
- ✅ Single composition: <30s
- ✅ Thumbnail: <5s
- ✅ Batch (5 videos): <35s combined
- ✅ Memory: <500MB per process
- ✅ Disk: Cleanup removes all temp files

### Quality Metrics
- ✅ 80%+ unit test coverage
- ✅ 70%+ integration test coverage
- ✅ 60%+ E2E test coverage
- ✅ Zero data loss on failures
- ✅ All errors logged with context

---

## TODO Tasks

### Phase 1: Foundation (Days 1-2)
- [ ] Install & configure FFmpeg binary in Docker
- [ ] Create FFmpegService with command builders
- [ ] Implement progress event parsing from ffmpeg output
- [ ] Create FileStorageService with download/upload logic
- [ ] Create ProgressTrackerService with event emitters
- [ ] Unit tests for all three services (80%+ coverage)
- [ ] Verify compilation: `npm run build`
- [ ] Commit: "feat(video): add ffmpeg wrapper and file storage services"

### Phase 2: Video Composition (Days 2-4)
- [ ] Update VideoComposerService with real compose() implementation
- [ ] Implement audio normalization (padding/trimming)
- [ ] Add source file validation
- [ ] Implement FFmpeg progress tracking
- [ ] Add database status updates
- [ ] Implement batch composition with p-queue
- [ ] Integration tests for composition workflow
- [ ] Test with real audio/video samples
- [ ] Verify compilation: `npm run build`
- [ ] Commit: "feat(video): implement ffmpeg composition pipeline"

### Phase 3: Thumbnail Generation (Days 4-5)
- [ ] Create ThumbnailGeneratorService
- [ ] Implement frame extraction from video
- [ ] Add text overlay rendering (FFmpeg drawtext)
- [ ] Implement image scaling/padding
- [ ] Add fallback strategies (placeholder on error)
- [ ] Integration tests for thumbnail generation
- [ ] Unit tests for thumbnail service (80%+ coverage)
- [ ] Test with various video dimensions
- [ ] Verify compilation: `npm run build`
- [ ] Commit: "feat(video): implement thumbnail generation"

### Phase 4: Error Handling & Recovery (Days 5-6)
- [ ] Create custom error classes for video composition
- [ ] Implement retry logic with exponential backoff
- [ ] Add graceful degradation strategies
- [ ] Implement temp file cleanup on all code paths
- [ ] Add timeout detection (60s max per video)
- [ ] Add circuit breaker for FFmpeg failures
- [ ] Test error scenarios in unit tests
- [ ] Verify cleanup works on failures
- [ ] Commit: "feat(video): add comprehensive error handling"

### Phase 5: Testing & Validation (Days 6-7)
- [ ] Write unit tests for all services (target 85%+ coverage)
- [ ] Write integration tests for composition workflows
- [ ] Write E2E tests for API endpoints
- [ ] Add performance benchmarks
- [ ] Profile memory usage
- [ ] Run full test suite: `npm run test:all`
- [ ] Verify coverage: `npm run test:coverage`
- [ ] Document performance metrics
- [ ] Fix any failing tests
- [ ] Commit: "test(video): add comprehensive test suite"

### Phase 6: Deployment & Documentation (Days 7-10)
- [ ] Update Dockerfile to install ffmpeg
- [ ] Add environment variables to .env.example
- [ ] Create docker-compose configuration
- [ ] Test Docker build locally
- [ ] Write video-composition-guide.md
- [ ] Update codebase-summary.md
- [ ] Add API documentation
- [ ] Update system-architecture.md diagram
- [ ] Create troubleshooting guide
- [ ] Verify all tests pass
- [ ] Commit: "docs(video): add composition guide and deployment docs"
- [ ] Test production Docker build: `docker-compose build`

---

## Unresolved Questions

1. **DALL-E 3 Thumbnail Fallback**: Should we always try AI generation on frame extraction failure, or only when explicitly enabled? Recommend: Enable via env var, default false (faster).

2. **S3 vs Local Storage**: Where should composed videos be stored in production? Recommend: S3 with CloudFront CDN for social media upload, fallback to local for dev.

3. **Audio Format**: Should we accept formats other than MP3 from ElevenLabs? Recommend: Accept MP3, WAV, AAC. Detect format and convert if needed.

4. **Video Quality Presets**: Should we offer multiple quality presets (fast/quality/balanced) or fixed to "fast" for speed? Recommend: Fixed to "fast" for consistency, document CRF 20 as baseline.

5. **Watermark Content**: What watermark text should be burned into videos? Recommend: Configurable per environment, default: "Learn More - Link in Bio"

6. **Caption Subtitles**: Phase 1 skips caption/subtitle generation. Should this be Phase 2 or separate task? Recommend: Separate task after core composition validated.

---

**Status**: Ready for Implementation
**Created**: 2025-11-01
**Last Updated**: 2025-11-01
**Next Review**: After Phase 1 completion
