# Implementation Plan: Video Composition with FFmpeg

**Status**: ✅ Ready for Implementation
**Created**: 2025-11-01
**Priority**: CRITICAL (Blocks autonomous video generation)
**Effort**: 20-40 hours | 7-10 days

---

## 📚 Documentation Structure

### Start Here
- **[PLAN-QUICK-LINKS.txt](./PLAN-QUICK-LINKS.txt)** - Quick reference guide (2 min read)
- **[IMPLEMENTATION-PLAN-SUMMARY.txt](./IMPLEMENTATION-PLAN-SUMMARY.txt)** - Executive summary (5 min read)

### Main Documents (in `/plans` directory)

1. **[251101-video-composition-ffmpeg-plan.md](./plans/251101-video-composition-ffmpeg-plan.md)** ⭐ PRIMARY
   - 1,367 lines, 44 KB
   - Complete implementation reference
   - Architecture, 6 phases, testing strategy, error handling
   - 60+ TODO tasks, risk mitigation
   - **Read time**: 1-2 hours
   - **Best for**: Detailed implementation guidance

2. **[251101-video-composition-summary.md](./plans/251101-video-composition-summary.md)**
   - 254 lines, 8 KB
   - Executive overview
   - Key components, timeline, metrics
   - **Read time**: 10 minutes
   - **Best for**: Quick overview, stakeholder briefing

3. **[FFMPEG-QUICK-START.md](./plans/FFMPEG-QUICK-START.md)**
   - 388 lines, 12 KB
   - Developer reference
   - FFmpeg installation, commands, templates, debugging
   - **Read time**: 15 minutes
   - **Best for**: During development, command reference

4. **[VIDEO-COMPOSITION-INDEX.md](./plans/VIDEO-COMPOSITION-INDEX.md)**
   - 319 lines, 12 KB
   - Navigation guide
   - Role-based reading paths, architecture overview
   - **Read time**: 10 minutes
   - **Best for**: Finding specific information

---

## 🎯 Quick Start (Choose Your Path)

### Project Managers
1. Read [IMPLEMENTATION-PLAN-SUMMARY.txt](./IMPLEMENTATION-PLAN-SUMMARY.txt) (5 min)
2. Review [251101-video-composition-summary.md](./plans/251101-video-composition-summary.md) (10 min)
3. Track progress using TODO checklist in main plan

### Developers
1. Read [IMPLEMENTATION-PLAN-SUMMARY.txt](./IMPLEMENTATION-PLAN-SUMMARY.txt) (5 min)
2. Check [FFMPEG-QUICK-START.md](./plans/FFMPEG-QUICK-START.md) - FFmpeg Installation section (5 min)
3. Install FFmpeg: `brew install ffmpeg` (macOS) or `apt-get install ffmpeg` (Linux)
4. Start Phase 1 using main plan checklist

### Architects
1. Read [251101-video-composition-summary.md](./plans/251101-video-composition-summary.md) (10 min)
2. Study Architecture section in [251101-video-composition-ffmpeg-plan.md](./plans/251101-video-composition-ffmpeg-plan.md) (30 min)
3. Review security & performance sections (20 min)

---

## 📊 At a Glance

### What's Being Built
Implement complete video composition pipeline using FFmpeg to combine:
- Voice audio (from ElevenLabs) + Video visuals (from Pika Labs)
- Generate: 1080x1920 (9:16) MP4 for YouTube Shorts, TikTok, Instagram Reels
- Support: Batch processing (5 parallel), progress tracking, error recovery
- Include: Thumbnail generation (1024x1024 PNG)

### Key Components
- **FFmpegService** (250 lines) - FFmpeg CLI wrapper
- **FileStorageService** (200 lines) - Download/upload/cleanup
- **ProgressTrackerService** (120 lines) - Real-time progress events
- **ThumbnailGeneratorService** (180 lines) - Frame extraction + text overlay
- **Updated VideoComposerService** - Replace TODO stubs with real implementation

### Timeline
```
Phase 1: Foundation (Days 1-2, 6-8h)
Phase 2: Composition (Days 2-4, 12-16h)
Phase 3: Thumbnails (Days 4-5, 6-8h)
Phase 4: Error Handling (Days 5-6, 6-8h)
Phase 5: Testing (Days 6-7, 8-10h)
Phase 6: Deployment (Days 7-10, 4-6h)

Total: 20-40 hours | 7-10 days
```

### Success Metrics
- 99%+ videos successfully composed
- <30s per video (composition)
- <5s per thumbnail
- 80%+ test coverage
- <500MB memory per process

---

## 🔑 Key FFmpeg Commands

### Compose Video
```bash
ffmpeg -i voice.mp3 -i visuals.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -r 30 -c:v libx264 -preset fast -crf 20 -b:v 7000k \
  -c:a aac -b:a 160k -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -movflags +faststart -shortest output.mp4
```

### Extract Thumbnail
```bash
ffmpeg -i input.mp4 -ss 00:00:30 -vframes 1 output.png
```

See [FFMPEG-QUICK-START.md](./plans/FFMPEG-QUICK-START.md) for more commands.

---

## 📂 File Locations

**Plan Documents**:
- `/plans/251101-video-composition-ffmpeg-plan.md` ← Main reference
- `/plans/251101-video-composition-summary.md` ← Executive summary
- `/plans/FFMPEG-QUICK-START.md` ← Developer quick start
- `/plans/VIDEO-COMPOSITION-INDEX.md` ← Navigation guide

**Summary Files** (Root directory):
- `/PLAN-QUICK-LINKS.txt` ← Quick reference links
- `/IMPLEMENTATION-PLAN-SUMMARY.txt` ← Extended summary
- `/README-PLAN.md` ← This file

**Current Code**:
- `src/modules/video/services/video-composer.service.ts` - TODO stubs
- `src/modules/video/services/elevenlabs.service.ts` - Working
- `src/modules/video/services/pikalabs.service.ts` - Working

---

## 🚀 Next Steps

1. **Read** [PLAN-QUICK-LINKS.txt](./PLAN-QUICK-LINKS.txt) (2 min)
2. **Read** [IMPLEMENTATION-PLAN-SUMMARY.txt](./IMPLEMENTATION-PLAN-SUMMARY.txt) (5 min)
3. **Choose** your role and follow recommended reading path above
4. **Install** FFmpeg: `brew install ffmpeg` or `apt-get install ffmpeg`
5. **Start** Phase 1 following checklist in main plan

---

## 📞 Need Help?

- **Quick Overview?** → Read [PLAN-QUICK-LINKS.txt](./PLAN-QUICK-LINKS.txt)
- **FFmpeg Help?** → Check [FFMPEG-QUICK-START.md](./plans/FFMPEG-QUICK-START.md)
- **Finding Something?** → Use [VIDEO-COMPOSITION-INDEX.md](./plans/VIDEO-COMPOSITION-INDEX.md)
- **Full Details?** → Read [251101-video-composition-ffmpeg-plan.md](./plans/251101-video-composition-ffmpeg-plan.md)
- **Debugging?** → See FFMPEG-QUICK-START.md debugging section

---

## ✨ What You Get

- **Architecture**: Complete system design with 4 new services
- **Commands**: 15+ FFmpeg examples for social media
- **Code**: TypeScript service templates
- **Tests**: Unit test templates + 80%+ coverage strategy
- **Docs**: 2,300+ lines of documentation
- **Timeline**: Detailed 6-phase schedule (7-10 days)
- **Tasks**: 60+ actionable items
- **Risks**: 7 identified risks with mitigations

---

**Status**: ✅ Ready for Implementation
**Created**: 2025-11-01
**Start With**: [PLAN-QUICK-LINKS.txt](./PLAN-QUICK-LINKS.txt)
