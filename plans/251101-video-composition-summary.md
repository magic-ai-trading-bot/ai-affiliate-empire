# Video Composition with FFmpeg - Plan Summary

**Created**: 2025-11-01
**Full Plan**: `/plans/251101-video-composition-ffmpeg-plan.md`
**Status**: Ready for Implementation
**Effort**: 20-40 hours | 7-10 days

---

## Executive Summary

Complete video composition pipeline using FFmpeg to merge voice audio (ElevenLabs) + video visuals (Pika Labs) into social media MP4s (YouTube Shorts, TikTok, Instagram Reels). Currently blocked by TODO stubs in video-composer.service.ts. Plan includes implementation strategy, ffmpeg commands, file handling, batch processing (5 parallel), progress tracking, error recovery.

**Impact**: Unblocks autonomous video generation → enables multi-platform publishing → critical path to $10k+/month revenue target.

---

## Key Components (4 New Services)

### 1. FFmpegService (250 lines)
- Type-safe ffmpeg CLI wrapper
- Command builders: compose, extract frame, scale, add text
- Progress parsing from stderr
- Custom error mapping
- Timeout handling (60s max)

### 2. FileStorageService (200 lines)
- Download remote files with retry
- Upload to S3/CDN
- Temp directory management
- File validation (type, size, integrity)
- Cleanup scheduler

### 3. ProgressTrackerService (120 lines)
- Event emitter for real-time progress
- Observable-based subscriptions
- Progress history tracking
- Timeout detection

### 4. ThumbnailGeneratorService (180 lines)
- Frame extraction (FFmpeg)
- Text overlay rendering
- Image scaling/padding
- DALL-E 3 fallback (optional)

Plus VideoComposerService updates + custom error classes.

---

## FFmpeg Command Strategy

### Composition Command
```bash
ffmpeg \
  -i voice.mp3 -i visuals.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -r 30 -c:v libx264 -preset fast -crf 20 -b:v 7000k \
  -c:a aac -b:a 160k \
  -af "aformat=channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11" \
  -movflags +faststart -shortest -y output.mp4
```

**Key Parameters**:
- `-vf scale=...` → 1080x1920 (9:16) with black letterbox
- `-preset fast` → 20s encoding time
- `-crf 20` → High quality (18-20 for social)
- `-b:v 7000k` → 7 Mbps bitrate
- `-af loudnorm` → Normalize audio to platform standard
- `-shortest` → Stop at shortest stream (no silence padding)

### Thumbnail Command
```bash
ffmpeg -i input.mp4 -ss 00:00:30 -vframes 1 \
  -vf "scale=1024:1024,pad=1024:1024:color=white,
        drawtext=text='ProductName':x=(w-text_w)/2:y=(h-text_h)/2:
        fontsize=48:fontcolor=white:box=1:boxcolor=black@0.5" \
  output.png
```

---

## Implementation Phases

### Phase 1: Foundation (Days 1-2, 6-8 hrs)
- Create FFmpegService (wrapper + progress parsing)
- Create FileStorageService (download/upload/cleanup)
- Create ProgressTrackerService (event emitter)
- Unit tests (80%+ coverage)

### Phase 2: Video Composition (Days 2-4, 12-16 hrs)
- Implement VideoComposerService.compose()
- Audio/video sync handling (padding, trimming)
- Batch processing with p-queue (5 parallel)
- Integration tests

### Phase 3: Thumbnails (Days 4-5, 6-8 hrs)
- ThumbnailGeneratorService (frame extraction + text)
- DALL-E 3 fallback (Phase 2)
- Caching support
- Integration tests

### Phase 4: Error Handling (Days 5-6, 6-8 hrs)
- Custom error classes
- Retry logic (exponential backoff)
- Graceful degradation strategies
- Cleanup on all code paths

### Phase 5: Testing (Days 6-7, 8-10 hrs)
- Unit tests: 85%+ coverage
- Integration tests: 70%+ coverage
- E2E tests: 60%+ coverage
- Performance benchmarks

### Phase 6: Deployment (Days 7-10, 4-6 hrs)
- Docker FFmpeg installation
- Environment configuration
- Documentation (setup, API, troubleshooting)
- Codebase summary updates

---

## Dependencies to Add

### Required
- `fluent-ffmpeg` (v2.1.3+) - FFmpeg wrapper
- `p-queue` (v7.3.0+) - Concurrency control

### Optional
- `sharp` (v0.32.0+) - Fast image processing (fallback)

### System Requirements
- FFmpeg binary (v4.4+) - Linux/macOS/Windows/Docker
- 2-5GB temp disk space
- 2GB+ RAM minimum
- Modern multi-core CPU

---

## Files to Create (8 new)

1. `src/modules/video/services/ffmpeg.service.ts` (250 lines)
2. `src/modules/video/services/file-storage.service.ts` (200 lines)
3. `src/modules/video/services/progress-tracker.service.ts` (120 lines)
4. `src/modules/video/services/thumbnail-generator.service.ts` (180 lines)
5. `src/common/exceptions/video-composition.error.ts` (50 lines)
6. `test/unit/video/video-composer.service.spec.ts` (400 lines)
7. `test/integration/video/video-composition.integration.spec.ts` (300 lines)
8. `docs/video-composition-guide.md` (200 lines)

## Files to Update (6 existing)

1. `src/modules/video/services/video-composer.service.ts` (+80 lines)
2. `src/modules/video/video.service.ts` (+20 lines)
3. `src/modules/video/video.controller.ts` (add endpoints)
4. `src/modules/video/video.module.ts` (register services)
5. `package.json` (add dependencies)
6. `docs/codebase-summary.md` (update status)

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Single composition | <30s | Fast preset, CRF 20 |
| Thumbnail generation | <5s | Frame extract + text |
| Batch (5 parallel) | <35s | Concurrent processing |
| Memory per process | <500MB | Monitor + limit |
| Temp disk usage | <2GB | Cleanup after each |
| Success rate | 99%+ | Error recovery |

---

## Testing Coverage

| Suite | Target | Scenarios |
|-------|--------|-----------|
| Unit | 85%+ | Services, commands, errors |
| Integration | 70%+ | Workflows, file ops, DB |
| E2E | 60%+ | API endpoints, WebSocket |
| Performance | - | Benchmarks, memory profiling |

---

## Key Architectural Decisions

1. **FFmpeg Wrapper**: Use `fluent-ffmpeg` (lighter) vs child_process (more control). Chosen: fluent-ffmpeg for reliability + less code.

2. **Concurrency**: Limit to 5 parallel (matches project targets). Use p-queue for fairness + backpressure.

3. **Storage**: Support S3 (prod) + local fallback (dev). URL validation + CDN abstraction.

4. **Thumbnails**: Extract frame (fast) → DALL-E 3 (fallback on error). Phase 2 enhancement.

5. **Error Strategy**: Recoverable (retry) vs permanent (fail fast). Graceful degradation where possible.

---

## Success Metrics

**Functional**:
- ✅ 99%+ videos successfully composed
- ✅ Audio/video sync <0.1s
- ✅ Thumbnail 95%+ success
- ✅ Batch handles 5 parallel
- ✅ 100% temp file cleanup

**Performance**:
- ✅ Composition <30s
- ✅ Thumbnail <5s
- ✅ Batch <35s
- ✅ Memory <500MB/process
- ✅ Disk cleanup verified

**Quality**:
- ✅ 80%+ unit test coverage
- ✅ 70%+ integration coverage
- ✅ 60%+ E2E coverage
- ✅ Zero data loss on failures
- ✅ All errors logged

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| FFmpeg not installed | HIGH | Docker install, health check |
| Audio/video sync drift | HIGH | Test various durations, auto-padding |
| Disk full during encoding | HIGH | Pre-check space, size limits |
| Memory exhaustion (5 parallel) | MEDIUM | Monitor, queue limiting |
| S3 upload timeout | MEDIUM | Retry, local fallback |
| Corrupted output | MEDIUM | Validate with ffprobe, delete |
| File permission issues | MEDIUM | Consistent temp dir, Docker |

---

## Unresolved Questions

1. **DALL-E 3 Fallback**: Always enable or env var? → Recommend: Env var, default false (faster).

2. **Storage Backend**: S3 vs local in prod? → Recommend: S3 + CloudFront CDN, local fallback.

3. **Audio Format**: Accept only MP3 or other formats? → Recommend: MP3, WAV, AAC with auto-detect.

4. **Quality Presets**: Fixed or configurable? → Recommend: Fixed (fast/CRF 20) for consistency.

5. **Watermark Text**: Configurable or hardcoded? → Recommend: Env var, default "Learn More".

6. **Captions Phase**: Separate task or Phase 2? → Recommend: Separate after core validation.

---

**Full detailed plan**: See `/plans/251101-video-composition-ffmpeg-plan.md`
