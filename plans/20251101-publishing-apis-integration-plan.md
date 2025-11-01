# Publishing APIs Integration Plan

**Date**: 2025-11-01
**Scope**: YouTube Data API v3, TikTok Content Posting API, Instagram Graph API
**Priority**: CRITICAL (blocks autonomous operation)
**Effort**: 60-80 hours
**Status**: PLANNING

---

## Executive Summary

Implement real publishing integrations for YouTube Shorts, TikTok, and Instagram Reels. Currently all three platforms return mock data. This integration is critical for autonomous operation.

**Current State**: 40% complete (mock implementations exist, actual API calls TODO)
**Target State**: 100% complete with OAuth2, file uploads, rate limiting, error handling
**Business Impact**: Enables autonomous multi-platform publishing (50+ videos/day across 3 platforms)

---

## Architecture Overview

### Components to Implement

```
publisher-module/
├── services/
│   ├── youtube.service.ts           [REWRITE] OAuth2 + Data API v3
│   ├── tiktok.service.ts            [REWRITE] Content Posting API
│   ├── instagram.service.ts         [REWRITE] Graph API
│   └── platform-storage.service.ts  [NEW] File download/management
├── auth/
│   ├── youtube-oauth.service.ts     [NEW] OAuth2 flow
│   ├── tiktok-oauth.service.ts      [NEW] OAuth2 flow
│   └── instagram-oauth.service.ts   [NEW] OAuth2 flow
├── utils/
│   ├── file-downloader.ts           [NEW] Download from URL
│   ├── video-validator.ts           [NEW] Validate video specs
│   ├── platform-adapters.ts         [NEW] API response mapping
│   └── rate-limiter.ts              [NEW] Platform-specific limits
├── models/
│   ├── youtube-upload.model.ts      [NEW] YouTube-specific types
│   ├── tiktok-upload.model.ts       [NEW] TikTok-specific types
│   └── instagram-upload.model.ts    [NEW] Instagram-specific types
└── dto/
    └── upload-response.dto.ts       [EXTEND] Common response format
```

### Data Flow

```
Video Ready
    ↓
[Platform Selection]
    ↓
[Authenticate with Platform]
    ↓
[Download Video from URL]
    ↓
[Validate Video Specs]
    ↓
[Upload to Platform]
    ↓
[Wait for Processing]
    ↓
[Fetch Published URL + Metadata]
    ↓
[Save Publication Record]
    ↓
[Start Analytics Collection]
```

---

## Requirements

### Functional Requirements

#### FR-1: YouTube Shorts Upload
- Use YouTube Data API v3
- Support OAuth2 (3-legged) authentication
- Upload vertical videos (9:16 aspect ratio, ≤60 seconds)
- Auto-add "#Shorts" to title/description for Short classification
- Support custom thumbnails
- Fetch upload URLs and video IDs
- Handle quota management (1,600 units per upload = ~6 videos/day)
- Support metadata: title, description, tags, category, language

#### FR-2: TikTok Video Upload
- Use TikTok Content Posting API (requires Business Account + API approval)
- Support OAuth2 (3-legged) authentication with user access token
- Upload via FILE_UPLOAD method (chunked, 5-64MB chunks)
- Support metadata: caption, hashtags, privacy level
- Handle upload URL expiry (1 hour timeout)
- Support both direct publish and draft modes (inbox)
- Fetch video ID and post URL upon success
- Rate limiting: 30 videos/day, 6 requests/minute per access token

#### FR-3: Instagram Reels Upload
- Use Instagram Graph API (Meta)
- Support OAuth2 authentication with long-lived access token (60-day refresh)
- Two-step upload: create container → publish container
- Support metadata: caption, hashtags, alt text
- Aspect ratio: 9:16 recommended (5-90 seconds)
- Container formats: MP4 (H.264), MOV (HEVC)
- Audio: AAC, 48kHz, 1-2 channels
- Handle token refresh before expiry
- Rate limiting: 25 posts/day (recommend 10 Reels)

#### FR-4: Analytics Fetching
- YouTube: Views, likes, comments, shares (via Insights API)
- TikTok: Views, likes, comments, shares, completion rate
- Instagram: Impressions, reach, engagement, saves, shares

#### FR-5: Error Handling & Retry
- Distinguish transient (retry) vs permanent (fail) errors
- Implement exponential backoff: 1s, 2s, 4s, 8s (max 3 retries)
- Log all errors with context: platform, videoId, attempt, error details
- Graceful degradation: if one platform fails, continue with others
- Mark publication as FAILED after max retries

#### FR-6: Rate Limiting
- YouTube: 6-20 videos/day (based on quota allocation)
- TikTok: 30 videos/day + 6 requests/minute
- Instagram: 25 posts/day (recommend 10 Reels)
- Implement per-platform token buckets
- Respect 1-hour window for uploads

### Non-Functional Requirements

#### NF-1: Security
- Store tokens in AWS Secrets Manager (encrypted)
- Never log tokens or credentials
- Rotate refresh tokens per OAuth2 spec
- Use HTTPS for all API calls
- Validate HTTPS redirects to same domain only

#### NF-2: Reliability
- Graceful fallback if storage/download fails
- Circuit breaker for unreachable APIs
- Database transaction for publication record creation
- Idempotent uploads (check if already published)

#### NF-3: Performance
- Parallel uploads to multiple platforms (Promise.all)
- Chunk downloads for large videos
- Cache OAuth2 tokens until expiry
- Async upload with status polling

#### NF-4: Monitoring
- Log all upload attempts with timestamps
- Track upload duration, file size, success/failure rate
- Alert on quota limit approaching
- Monitor token refresh cycles

#### NF-5: Testability
- Mock OAuth2 flows for tests
- Mock file uploads with test videos
- Fixture API responses for each platform
- Unit, integration, and E2E tests

---

## Platform API Details

### 1. YouTube Data API v3

#### Authentication
**Flow**: OAuth2 (3-legged)
```
Step 1: Redirect user to:
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=xxx&
  redirect_uri=http://localhost:3000/auth/youtube/callback&
  scope=https://www.googleapis.com/auth/youtube&
  response_type=code&
  access_type=offline

Step 2: Exchange code for tokens:
POST https://oauth2.googleapis.com/token
  grant_type=authorization_code&
  code=xxx&
  client_id=xxx&
  client_secret=xxx&
  redirect_uri=xxx

Step 3: Use access_token for API calls
```

#### Video Upload Endpoint
```
POST https://www.googleapis.com/youtube/v3/videos?part=snippet,status,processingDetails
Headers:
  Authorization: Bearer {accessToken}
  X-Goog-Upload-Protocol: resumable

Body:
{
  "snippet": {
    "title": "Product Review #Shorts",
    "description": "Check out this amazing product! ...",
    "tags": ["shorts", "review", "affiliate"],
    "categoryId": "22",  // People & Blogs
    "defaultLanguage": "en"
  },
  "status": {
    "privacyStatus": "public",
    "madeForKids": false
  }
}
```

#### Video Upload (Resumable)
```
POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&...
Headers:
  Authorization: Bearer {accessToken}
  X-Goog-Upload-Protocol: resumable
  X-Goog-Upload-Command: start

Step 1: Start resumable session (get upload URL)
Step 2: Upload video file to returned URL
Step 3: Finalize upload with "finalize" command
Step 4: Poll /videos/{videoId} until status.uploadStatus = "processed"
```

#### Quota
- Default: 10,000 units/day
- Upload video: 1,600 units
- Maximum: 6-20 videos/day depending on quota

#### Shorts Classification
- Add "#Shorts" to title AND description
- Set video < 60 seconds
- Vertical aspect ratio (9:16)
- YouTube will automatically classify if above criteria met

#### File Specifications
- Format: MP4 (H.264 + AAC)
- Max size: 256GB (for very large files)
- Resolution: 1080x1920 (vertical, 9:16)
- Duration: ≤60 seconds for Shorts
- Frame rate: 24-60 fps
- Bitrate: 2-4 Mbps

---

### 2. TikTok Content Posting API

#### Authentication
**Status**: Requires Business Account + API approval (1-4 weeks)

**Flow**: OAuth2 (3-legged) + Client Credentials
```
Step 1: Redirect user to:
https://www.tiktok.com/v2/oauth/authorize?
  client_key=xxx&
  redirect_uri=xxx&
  scope=video.upload,user.info.basic&
  response_type=code&
  state=xxx

Step 2: Exchange code for access_token:
POST https://open.tiktokapis.com/v2/oauth/token/
  client_key=xxx&
  client_secret=xxx&
  code=xxx&
  grant_type=authorization_code&
  redirect_uri=xxx

Step 3: Use access_token for uploads
Token expires in ~2 hours, has 6 requests/minute limit
```

#### Video Upload Endpoints

**Initialize Upload (FILE_UPLOAD)**:
```
POST https://open.tiktokapis.com/v2/post/publish/video/init/
Headers:
  Authorization: Bearer {accessToken}
  Content-Type: application/json

Body:
{
  "source": "FILE_UPLOAD",  // or "PULL_FROM_URL"
  "chunk_size": 67108864,   // 64MB chunks (5MB-64MB)
  "total_size": 314572800,  // total video size
  "filename": "video.mp4"
}

Response:
{
  "data": {
    "upload_id": "xxx",
    "upload_url": "https://..."
  }
}
```

**Upload Video Chunks**:
```
PUT {uploadUrl}
Headers:
  Content-Range: bytes start-end/total
  Content-Length: chunkSize

Body: binary video data

Note: Each chunk 5-64MB, except last chunk can be >64MB up to 128MB
      Upload must complete within 1 hour
```

**Publish Video**:
```
POST https://open.tiktokapis.com/v2/post/publish/video/
OR for draft: /v2/post/publish/inbox/video/

Body:
{
  "source_info": {
    "source": "FILE_UPLOAD",
    "video": {
      "upload_id": "xxx"
    }
  },
  "post_info": {
    "title": "Amazing product review! #shorts",  // <= 150 chars
    "description": "Check it out...",           // <= 2200 chars
    "disable_comment": false,
    "disable_duet": false,
    "disable_stitch": false,
    "video_cover_timestamp_ms": 5000  // 5 seconds in
  }
}

Response: { data: { publish_id: "xxx", video_id: "xxx" } }
```

#### Rate Limits
- Access token: 6 requests/minute (per user)
- Upload quota: 30 videos/day per user
- Chunk upload: 5-64MB per chunk (except final)
- Upload timeout: 1 hour per session

#### File Specifications
- Format: MP4 (H.264 + AAC)
- Resolution: 1080x1920 (vertical, 9:16) recommended
- Duration: 3 seconds - 10 minutes
- Frame rate: 24-60 fps
- File size: >= 5MB (recommended), max 128MB
- Bitrate: 1-6 Mbps
- Audio: Mono or stereo, 48kHz
- Codecs: H.264 video, AAC audio

---

### 3. Instagram Graph API (Reels)

#### Authentication
**Flow**: OAuth2 (long-lived tokens)

```
Step 1: Redirect user to:
https://www.instagram.com/oauth/authorize?
  client_id=xxx&
  redirect_uri=xxx&
  scope=instagram_basic,instagram_content_publish&
  response_type=code

Step 2: Exchange code for short-lived token (1 hour):
POST https://graph.instagram.com/v19.0/oauth/access_token
  client_id=xxx&
  client_secret=xxx&
  grant_type=authorization_code&
  code=xxx&
  redirect_uri=xxx

Step 3: Exchange short-lived for long-lived (60 days):
GET https://graph.instagram.com/v19.0/access_token?
  grant_type=ig_refresh_token&
  access_token={shortLivedToken}&
  client_secret=xxx

Step 4: Use long-lived token for uploads
```

#### Media Upload (Two-Step Process)

**Step 1: Create Media Container**:
```
POST https://graph.instagram.com/v19.0/{igUserId}/media
Headers:
  Authorization: Bearer {accessToken}
  Content-Type: application/json

Body:
{
  "video_url": "https://...",  // Direct download link
  "media_type": "REELS",
  "caption": "Amazing product! #affiliate #review",
  "access_role": "OWNER"
}

Response:
{
  "id": "xxxxx",  // container ID (not final media ID)
  "upload_status": "IN_PROGRESS"
}
```

**Step 2: Publish Media Container**:
```
POST https://graph.instagram.com/v19.0/{igUserId}/media_publish
Body:
{
  "creation_id": "{containerId}"
}

Response:
{
  "id": "xxxxx"  // Final media ID
}
```

**Fetch Published URL**:
```
GET https://graph.instagram.com/v19.0/{mediaId}?
  fields=id,media_type,timestamp,permalink

Response includes: permalink (direct link to reel)
```

#### Rate Limits
- Posts: 25/day total (recommend 10 for Reels)
- Batch operations: <= 50 requests/hour
- Token refresh: Before 60-day expiry (calendar reminder needed)

#### File Specifications
- Format: MP4 (H.264 + AAC) or MOV (HEVC + AAC)
- Container: No edit lists, moov atom at front
- Resolution: 1080x1920 (9:16 aspect ratio recommended)
- Duration: 5-90 seconds (eligible for Reels tab)
- Frame rate: 23-60 fps
- Video codec: H.264 or HEVC, progressive scan, closed GOP, 4:2:0 chroma
- Audio codec: AAC, 48kHz, 1-2 channels (mono/stereo)
- File size: No strict limit, but recommend < 5GB

---

## Implementation Strategy

### Phase 1: Foundation & Authentication (Days 1-3, 24 hours)

#### Task 1.1: Create OAuth2 Base Service
**File**: `src/modules/publisher/auth/oauth2-base.service.ts`

```typescript
// Base OAuth2 flow implementation
- Abstract class for OAuth2 patterns
- Methods: generateAuthUrl(), exchangeCode(), refreshToken()
- Secure token storage in Secrets Manager
- Token expiry tracking
- Automatic refresh before expiry
```

#### Task 1.2: YouTube OAuth2 Implementation
**File**: `src/modules/publisher/auth/youtube-oauth.service.ts`

```typescript
// YouTube-specific OAuth2
- Google auth flow
- Scope: https://www.googleapis.com/auth/youtube
- Handle redirect callback
- Store refresh_token for offline access
- Auto-refresh access token

// Constructor: Inject config, secrets manager, HTTP client
// Methods:
//   - generateAuthUrl(): string
//   - handleCallback(code: string): Promise<Tokens>
//   - refreshAccessToken(): Promise<string>
//   - isTokenExpired(): boolean
```

#### Task 1.3: TikTok OAuth2 Implementation
**File**: `src/modules/publisher/auth/tiktok-oauth.service.ts`

```typescript
// TikTok-specific OAuth2
- TikTok auth flow
- Scope: video.upload,user.info.basic
- 2-hour token expiry handling
- User access_token storage

// Methods:
//   - generateAuthUrl(state: string): string
//   - handleCallback(code: string): Promise<Tokens>
//   - getAccessToken(): Promise<string>
//   - isAccessTokenValid(): boolean
```

#### Task 1.4: Instagram OAuth2 Implementation
**File**: `src/modules/publisher/auth/instagram-oauth.service.ts`

```typescript
// Instagram-specific OAuth2
- Meta auth flow
- Scope: instagram_basic,instagram_content_publish
- Long-lived token (60 days)
- Token refresh with 10-day buffer

// Methods:
//   - generateAuthUrl(state: string): string
//   - handleCallback(code: string): Promise<LongLivedToken>
//   - ensureValidToken(): Promise<string>
//   - refreshTokenIfNeeded(): Promise<void>
//   - getRemainingDays(): number
```

#### Task 1.5: Auth Controller for OAuth2 Callbacks
**File**: `src/modules/publisher/auth/auth.controller.ts`

```typescript
// OAuth2 callback handlers
@Controller('auth')
export class AuthController {
  @Get('youtube/callback')
  youtubeCallback(@Query('code') code: string): Promise<any>

  @Get('tiktok/callback')
  tiktokCallback(@Query('code') code: string): Promise<any>

  @Get('instagram/callback')
  instagramCallback(@Query('code') code: string): Promise<any>

  @Get('youtube/status')
  youtubeStatus(): Promise<any>  // Check if authenticated

  @Get('tiktok/status')
  tiktokStatus(): Promise<any>

  @Get('instagram/status')
  instagramStatus(): Promise<any>
}
```

**Error Handling**:
- Invalid code: 400 Bad Request
- State mismatch: 400 Bad Request
- Token exchange failure: 503 Service Unavailable
- Network error: 503 Service Unavailable
- Log all with context: platform, error code, timestamp

---

### Phase 2: File Handling & Validation (Days 4-5, 16 hours)

#### Task 2.1: File Downloader Service
**File**: `src/modules/publisher/services/file-downloader.service.ts`

```typescript
@Injectable()
export class FileDownloaderService {
  // Download video from URL
  // - Support resumable downloads
  // - Validate HTTPS
  // - Timeout: 5 minutes
  // - Retry logic: 3 attempts
  // - Stream to temp storage or memory buffer

  async downloadVideo(
    videoUrl: string,
    options?: { maxRetries: number; timeout: number }
  ): Promise<{ path: string; size: number; mimeType: string }>

  private validateUrl(url: string): void
  private createRetryPolicy(): RetryPolicy
  private cleanupTempFile(path: string): Promise<void>
}
```

**Implementation Notes**:
```typescript
// Use axios with streaming for large files
// Follow redirects max 3 times
// Validate content-type: video/mp4, video/quicktime
// Check content-length before download
// Store in /tmp with 24-hour cleanup
```

#### Task 2.2: Video Validator Service
**File**: `src/modules/publisher/services/video-validator.service.ts`

```typescript
@Injectable()
export class VideoValidatorService {
  // Validate video specifications per platform
  // - Aspect ratio
  // - Duration
  // - Resolution
  // - Codec
  // - File size
  // - Frame rate

  // Use ffprobe for metadata extraction
  async validateForPlatform(
    videoPath: string,
    platform: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM'
  ): Promise<ValidationResult>

  private validateAspectRatio(videoPath: string, platform: string): boolean
  private validateDuration(duration: number, platform: string): boolean
  private validateResolution(width: number, height: number): boolean
  private validateCodec(videoCodec: string, audioCodec: string): boolean
  private validateFileSize(size: number): boolean
  private validateFrameRate(fps: number): boolean
  private extractMetadata(videoPath: string): Promise<VideoMetadata>
}
```

**Validation Rules**:
```typescript
// YouTube Shorts
- Aspect ratio: 9:16 (vertical)
- Duration: <= 60 seconds
- Resolution: >= 1080x1920
- Codecs: H.264 + AAC
- File size: < 256GB (very permissive)
- Frame rate: 24-60 fps

// TikTok
- Aspect ratio: 9:16 recommended (accepts 0.75-1.33)
- Duration: 3 seconds - 10 minutes
- Resolution: >= 1080x1920
- Codecs: H.264 + AAC (supports HEVC)
- File size: 5MB - 128MB
- Frame rate: 24-60 fps

// Instagram Reels
- Aspect ratio: 9:16 recommended (0.01:1 - 10:1 allowed)
- Duration: 5-90 seconds (for tab visibility)
- Resolution: >= 1080x1920
- Codecs: H.264 + AAC (or HEVC + AAC)
- Video codec: Progressive scan, closed GOP, 4:2:0
- Audio: 48kHz, mono/stereo
- Container: MP4/MOV with moov atom at front
```

#### Task 2.3: Platform Adapters
**File**: `src/modules/publisher/utils/platform-adapters.ts`

```typescript
// Convert video metadata/response to platform-specific format
// Handle pagination, rate limits, error codes

export class YouTubeAdapter {
  static mapMetadata(video: VideoMetadata): YouTubeVideoRequest
  static mapResponse(response: any): PublishedVideoData
  static mapError(error: any): PlatformError
}

export class TikTokAdapter {
  static mapMetadata(video: VideoMetadata): TikTokVideoRequest
  static mapResponse(response: any): PublishedVideoData
  static mapError(error: any): PlatformError
}

export class InstagramAdapter {
  static mapMetadata(video: VideoMetadata): InstagramMediaRequest
  static mapResponse(response: any): PublishedVideoData
  static mapError(error: any): PlatformError
}
```

#### Task 2.4: Rate Limiter Service
**File**: `src/modules/publisher/services/rate-limiter.service.ts`

```typescript
@Injectable()
export class RateLimiterService {
  // Per-platform rate limiting using Redis (or in-memory for dev)
  // Token bucket algorithm

  async checkLimit(platform: string): Promise<boolean>
  async consumeToken(platform: string): Promise<void>
  async getRemainingTokens(platform: string): Promise<number>
  async resetDaily(): Promise<void>

  private initializePlatformLimits(): void
  private startDailyReset(): void
}

// Limits
const RATE_LIMITS = {
  YOUTUBE: { tokens: 6, window: 'day', perMinute: null },
  TIKTOK: { tokens: 30, window: 'day', perMinute: 6 },
  INSTAGRAM: { tokens: 10, window: 'day', perMinute: null }
};
```

---

### Phase 3: YouTube Implementation (Days 6-8, 20 hours)

#### Task 3.1: YouTube Service Rewrite
**File**: `src/modules/publisher/services/youtube.service.ts` (REWRITE)

```typescript
@Injectable()
export class YoutubeService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly oauth: YoutubeOAuthService,
    private readonly downloader: FileDownloaderService,
    private readonly validator: VideoValidatorService,
    private readonly rateLimiter: RateLimiterService,
    private readonly adapter: YouTubeAdapter,
    private readonly logger: LoggerService,
    private readonly httpClient: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Upload video as YouTube Short
   * 1. Authenticate with OAuth2
   * 2. Download video from URL
   * 3. Validate video specs
   * 4. Check rate limits
   * 5. Upload with metadata
   * 6. Poll until processed
   * 7. Return video ID + URL
   */
  async uploadShort(params: UploadShortParams): Promise<UploadResult> {
    const startTime = Date.now();

    try {
      // 1. Ensure valid token
      const accessToken = await this.oauth.ensureValidToken();
      if (!accessToken) {
        throw new YoutubeAuthenticationError(
          'YouTube authentication required. Use /auth/youtube/callback'
        );
      }

      // 2. Check rate limit
      const canUpload = await this.rateLimiter.checkLimit('YOUTUBE');
      if (!canUpload) {
        throw new RateLimitError(
          'YouTube daily quota exceeded. Retry tomorrow.'
        );
      }

      // 3. Download video
      const { path: videoPath, size, mimeType } =
        await this.downloader.downloadVideo(params.videoUrl);

      // 4. Validate video
      const validation = await this.validator.validateForPlatform(
        videoPath,
        'YOUTUBE'
      );
      if (!validation.isValid) {
        throw new ValidationError(
          `Video invalid: ${validation.errors.join(', ')}`
        );
      }

      // 5. Create upload metadata
      const uploadMetadata = {
        snippet: {
          title: `${params.title} #Shorts`,  // Add #Shorts for classification
          description: params.description,
          tags: ['shorts', 'affiliate', 'review'],
          categoryId: '22',  // People & Blogs
          defaultLanguage: 'en',
        },
        status: {
          privacyStatus: 'public',
          madeForKids: false,
        },
      };

      // 6. Upload video using resumable protocol
      const uploadUrl = await this.initResumableUpload(
        accessToken,
        uploadMetadata
      );

      const videoId = await this.uploadVideoChunks(
        uploadUrl,
        videoPath,
        params.title
      );

      // 7. Upload thumbnail if provided
      if (params.thumbnailUrl) {
        await this.uploadThumbnail(videoId, params.thumbnailUrl, accessToken);
      }

      // 8. Poll for processing completion
      await this.pollUntilProcessed(videoId, accessToken);

      // 9. Consume rate limit token
      await this.rateLimiter.consumeToken('YOUTUBE');

      // 10. Cleanup
      await this.cleanupTempFile(videoPath);

      const duration = Date.now() - startTime;

      this.logger.info('YouTube upload successful', {
        videoId,
        title: params.title,
        duration: `${(duration / 1000).toFixed(1)}s`,
        fileSize: `${(size / 1024 / 1024).toFixed(1)}MB`,
      });

      return {
        videoId,
        url: `https://youtube.com/shorts/${videoId}`,
        platform: 'YOUTUBE',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      };

    } catch (error) {
      this.logger.error('YouTube upload failed', {
        title: params.title,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Initialize resumable upload session
   */
  private async initResumableUpload(
    accessToken: string,
    metadata: any
  ): Promise<string> {
    const response = await this.httpClient.post(
      'https://www.googleapis.com/upload/youtube/v3/videos',
      metadata,
      {
        params: {
          part: 'snippet,status',
          uploadType: 'resumable',
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
        },
      }
    ).toPromise();

    const uploadUrl = response.headers['location'];
    if (!uploadUrl) {
      throw new Error('YouTube did not return upload URL');
    }

    return uploadUrl;
  }

  /**
   * Upload video file in chunks using resumable protocol
   */
  private async uploadVideoChunks(
    uploadUrl: string,
    videoPath: string,
    title: string
  ): Promise<string> {
    // Read file and upload
    const CHUNK_SIZE = 256 * 1024 * 1024;  // 256MB chunks

    // For now, single upload. TODO: Implement chunked upload for large files
    const videoBuffer = fs.readFileSync(videoPath);

    const response = await this.httpClient.put(
      uploadUrl,
      videoBuffer,
      {
        headers: {
          'X-Goog-Upload-Command': 'finalize',
          'Content-Type': 'video/mp4',
        },
      }
    ).toPromise();

    // Extract videoId from response
    const videoId = response.data.id;
    if (!videoId) {
      throw new Error('YouTube did not return video ID');
    }

    return videoId;
  }

  /**
   * Upload custom thumbnail
   */
  private async uploadThumbnail(
    videoId: string,
    thumbnailUrl: string,
    accessToken: string
  ): Promise<void> {
    // Download thumbnail
    const { path: thumbPath } =
      await this.downloader.downloadVideo(thumbnailUrl);

    const thumbBuffer = fs.readFileSync(thumbPath);

    await this.httpClient.post(
      `https://www.googleapis.com/upload/youtube/v3/thumbnails/set`,
      thumbBuffer,
      {
        params: { videoId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'image/jpeg',
        },
      }
    ).toPromise();

    await this.cleanupTempFile(thumbPath);
  }

  /**
   * Poll until video processing complete
   * YouTube takes 30-90 seconds to process videos
   */
  private async pollUntilProcessed(
    videoId: string,
    accessToken: string,
    maxAttempts: number = 30  // 30 * 3s = 90s max wait
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await this.httpClient.get(
        'https://www.googleapis.com/youtube/v3/videos',
        {
          params: {
            part: 'processingDetails,status',
            id: videoId,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      ).toPromise();

      const video = response.data.items[0];
      const status = video.processingDetails?.processingStatus;

      if (status === 'succeeded') {
        return;
      }

      if (status === 'failed') {
        throw new Error(
          `Video processing failed: ${video.processingDetails.processingFailureReason}`
        );
      }

      // Wait 3 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    throw new Error('Video processing timeout (>90s)');
  }

  /**
   * Get video statistics
   * YouTube rate limit: 1 read per video per query
   */
  async getVideoStats(videoId: string): Promise<VideoStats> {
    try {
      const accessToken = await this.oauth.getAccessToken();

      const response = await this.httpClient.get(
        'https://www.googleapis.com/youtube/v3/videos',
        {
          params: {
            part: 'statistics',
            id: videoId,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      ).toPromise();

      const stats = response.data.items[0]?.statistics || {};

      return {
        views: parseInt(stats.viewCount || '0'),
        likes: parseInt(stats.likeCount || '0'),
        comments: parseInt(stats.commentCount || '0'),
        shares: 0,  // YouTube API doesn't expose share count
      };
    } catch (error) {
      this.logger.error('Failed to fetch YouTube stats', {
        videoId,
        error: error.message,
      });

      return { views: 0, likes: 0, comments: 0, shares: 0 };
    }
  }

  /**
   * Check if YouTube is configured and authenticated
   */
  isConfigured(): boolean {
    return this.oauth.isAuthenticated();
  }

  private async cleanupTempFile(path: string): Promise<void> {
    try {
      fs.unlinkSync(path);
    } catch (error) {
      this.logger.warn('Failed to cleanup temp file', { path });
    }
  }

  onModuleDestroy() {
    // Cleanup timers, close connections
  }
}
```

#### Task 3.2: YouTube Error Handling
**File**: `src/modules/publisher/exceptions/youtube.exceptions.ts`

```typescript
export class YoutubeAuthenticationError extends Error {}
export class YoutubeQuotaExceededError extends Error {}
export class YoutubeValidationError extends Error {}
export class YoutubeUploadFailedError extends Error {}
export class YoutubeProcessingError extends Error {}
```

#### Task 3.3: YouTube Unit Tests
**File**: `test/unit/publisher/youtube.service.spec.ts`

```typescript
describe('YoutubeService', () => {
  let service: YoutubeService;
  let oauth: MockYoutubeOAuthService;
  let downloader: MockFileDownloaderService;
  let validator: MockVideoValidatorService;
  let httpClient: MockHttpService;

  beforeEach(async () => {
    // Setup mocks
  });

  describe('uploadShort', () => {
    it('should upload valid video', async () => {
      // Test happy path
    });

    it('should fail if not authenticated', async () => {
      // Test auth error
    });

    it('should fail if rate limit exceeded', async () => {
      // Test rate limit
    });

    it('should fail if video validation fails', async () => {
      // Test validation
    });

    it('should retry on transient error', async () => {
      // Test retry logic
    });

    it('should timeout if processing takes > 90s', async () => {
      // Test timeout
    });
  });

  describe('getVideoStats', () => {
    it('should fetch video statistics', async () => {
      // Test stats retrieval
    });

    it('should return zeros if stats unavailable', async () => {
      // Test fallback
    });
  });
});
```

---

### Phase 4: TikTok Implementation (Days 9-11, 20 hours)

#### Task 4.1: TikTok Service Rewrite
**File**: `src/modules/publisher/services/tiktok.service.ts` (REWRITE)

```typescript
@Injectable()
export class TiktokService implements OnModuleInit {
  constructor(
    private readonly oauth: TiktokOAuthService,
    private readonly downloader: FileDownloaderService,
    private readonly validator: VideoValidatorService,
    private readonly rateLimiter: RateLimiterService,
    private readonly adapter: TikTokAdapter,
    private readonly logger: LoggerService,
    private readonly httpClient: HttpService,
  ) {}

  /**
   * Upload video to TikTok
   * TikTok uses chunked upload with init → upload chunks → publish flow
   *
   * Rate limits:
   * - 30 videos/day per user
   * - 6 requests/minute per access_token
   * - Upload URL valid for 1 hour
   */
  async uploadVideo(params: UploadVideoParams): Promise<UploadResult> {
    const startTime = Date.now();

    try {
      // 1. Ensure valid access token
      const accessToken = await this.oauth.ensureValidToken();
      if (!accessToken) {
        throw new TiktokAuthenticationError(
          'TikTok authentication required. Use /auth/tiktok/callback'
        );
      }

      // 2. Check rate limits
      const canUpload = await this.rateLimiter.checkLimit('TIKTOK');
      if (!canUpload) {
        throw new RateLimitError(
          'TikTok daily quota exceeded (30 videos/day). Retry tomorrow.'
        );
      }

      // 3. Download video
      const { path: videoPath, size } =
        await this.downloader.downloadVideo(params.videoUrl);

      // 4. Validate video
      const validation = await this.validator.validateForPlatform(
        videoPath,
        'TIKTOK'
      );
      if (!validation.isValid) {
        throw new ValidationError(
          `Video invalid for TikTok: ${validation.errors.join(', ')}`
        );
      }

      // 5. Initialize upload session
      const { uploadId, uploadUrl } = await this.initUpload(
        accessToken,
        size
      );

      // 6. Upload video in chunks
      await this.uploadVideoChunks(uploadUrl, videoPath);

      // 7. Publish video
      const { publishId, videoId } = await this.publishVideo(
        accessToken,
        uploadId,
        params.caption
      );

      // 8. Consume rate limit
      await this.rateLimiter.consumeToken('TIKTOK');

      // 9. Cleanup
      await this.cleanupTempFile(videoPath);

      const duration = Date.now() - startTime;

      this.logger.info('TikTok upload successful', {
        videoId,
        publishId,
        caption: params.caption.substring(0, 50),
        duration: `${(duration / 1000).toFixed(1)}s`,
        fileSize: `${(size / 1024 / 1024).toFixed(1)}MB`,
      });

      return {
        videoId,
        url: `https://www.tiktok.com/@user/video/${videoId}`,
        platform: 'TIKTOK',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      };

    } catch (error) {
      this.logger.error('TikTok upload failed', {
        caption: params.caption.substring(0, 50),
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Initialize upload session with TikTok
   * Returns upload ID and presigned upload URL valid for 1 hour
   */
  private async initUpload(
    accessToken: string,
    totalSize: number
  ): Promise<{ uploadId: string; uploadUrl: string }> {
    const CHUNK_SIZE = 64 * 1024 * 1024;  // 64MB per chunk

    const response = await this.httpClient.post(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        source: 'FILE_UPLOAD',
        chunk_size: CHUNK_SIZE,
        total_size: totalSize,
        filename: `video_${Date.now()}.mp4`,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    ).toPromise();

    if (response.data.error || response.status !== 200) {
      throw new TiktokUploadError(
        `Init failed: ${response.data.error?.message}`
      );
    }

    return {
      uploadId: response.data.data.upload_id,
      uploadUrl: response.data.data.upload_url,
    };
  }

  /**
   * Upload video file in chunks to presigned URL
   * Each chunk: 5MB-64MB (except last chunk which can be >64MB)
   */
  private async uploadVideoChunks(
    uploadUrl: string,
    videoPath: string,
    maxRetries: number = 3
  ): Promise<void> {
    const CHUNK_SIZE = 64 * 1024 * 1024;  // 64MB
    const fileSize = fs.statSync(videoPath).size;
    const fileStream = fs.createReadStream(videoPath, {
      highWaterMark: CHUNK_SIZE,
    });

    let chunkIndex = 0;
    let uploadedBytes = 0;

    for await (const chunk of fileStream) {
      const isLastChunk = uploadedBytes + chunk.length >= fileSize;
      const contentRange = `bytes ${uploadedBytes}-${uploadedBytes + chunk.length - 1}/${fileSize}`;

      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          await this.httpClient.put(
            uploadUrl,
            chunk,
            {
              headers: {
                'Content-Range': contentRange,
                'Content-Length': chunk.length.toString(),
              },
            }
          ).toPromise();

          this.logger.debug('Chunk uploaded', {
            chunkIndex,
            bytes: chunk.length,
            contentRange,
          });

          uploadedBytes += chunk.length;
          chunkIndex++;
          break;

        } catch (error) {
          lastError = error;

          if (attempt < maxRetries - 1) {
            // Exponential backoff: 1s, 2s, 4s
            await new Promise(resolve =>
              setTimeout(resolve, Math.pow(2, attempt) * 1000)
            );
          }
        }
      }

      if (lastError) {
        throw lastError;
      }
    }
  }

  /**
   * Publish video after upload complete
   * Returns publish ID and video ID
   */
  private async publishVideo(
    accessToken: string,
    uploadId: string,
    caption: string
  ): Promise<{ publishId: string; videoId: string }> {
    const response = await this.httpClient.post(
      'https://open.tiktokapis.com/v2/post/publish/video/',
      {
        source_info: {
          source: 'FILE_UPLOAD',
          video: { upload_id: uploadId },
        },
        post_info: {
          title: caption.substring(0, 150),  // Max 150 chars
          description: caption,              // Max 2200 chars
          disable_comment: false,
          disable_duet: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 5000,  // 5 seconds
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    ).toPromise();

    if (response.data.error) {
      throw new TiktokUploadError(
        `Publish failed: ${response.data.error.message}`
      );
    }

    return {
      publishId: response.data.data.publish_id,
      videoId: response.data.data.video_id,
    };
  }

  /**
   * Get video statistics
   * Requires user access token with user.info.basic scope
   */
  async getVideoStats(videoId: string): Promise<VideoStats> {
    try {
      const accessToken = await this.oauth.getAccessToken();

      const response = await this.httpClient.get(
        `https://open.tiktokapis.com/v2/post/publish/status/fetch`,
        {
          params: { video_id: videoId },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      ).toPromise();

      const data = response.data.data;

      return {
        views: data.video_view_count || 0,
        likes: data.video_like_count || 0,
        comments: data.video_comment_count || 0,
        shares: data.video_share_count || 0,
      };
    } catch (error) {
      this.logger.warn('Failed to fetch TikTok stats', {
        videoId,
        error: error.message,
      });

      return { views: 0, likes: 0, comments: 0, shares: 0 };
    }
  }

  isConfigured(): boolean {
    return this.oauth.isAuthenticated();
  }

  private async cleanupTempFile(path: string): Promise<void> {
    try {
      fs.unlinkSync(path);
    } catch (error) {
      this.logger.warn('Failed to cleanup temp file', { path });
    }
  }
}
```

#### Task 4.2: TikTok Error Handling
**File**: `src/modules/publisher/exceptions/tiktok.exceptions.ts`

```typescript
export class TiktokAuthenticationError extends Error {}
export class TiktokRateLimitError extends Error {}
export class TiktokUploadError extends Error {}
export class TiktokValidationError extends Error {}
```

#### Task 4.3: TikTok Integration Tests
**File**: `test/integration/publisher/tiktok.integration.spec.ts`

```typescript
describe('TikTok Publishing Integration', () => {
  // Mock entire TikTok API flow
  // Test upload with chunked transmission
  // Test retry on chunk failure
  // Test publish after upload
});
```

---

### Phase 5: Instagram Implementation (Days 12-14, 20 hours)

#### Task 5.1: Instagram Service Rewrite
**File**: `src/modules/publisher/services/instagram.service.ts` (REWRITE)

```typescript
@Injectable()
export class InstagramService implements OnModuleInit {
  constructor(
    private readonly oauth: InstagramOAuthService,
    private readonly downloader: FileDownloaderService,
    private readonly validator: VideoValidatorService,
    private readonly rateLimiter: RateLimiterService,
    private readonly adapter: InstagramAdapter,
    private readonly logger: LoggerService,
    private readonly httpClient: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Upload video as Instagram Reel
   * Two-step process:
   * 1. Create media container with video URL
   * 2. Publish container to make it visible
   *
   * Rate limits: 25 posts/day (recommend 10 Reels)
   * Token expiry: 60 days (refresh before expiry)
   */
  async uploadReel(params: UploadReelParams): Promise<UploadResult> {
    const startTime = Date.now();

    try {
      // 1. Ensure valid long-lived token (refresh if needed)
      const accessToken = await this.oauth.ensureValidToken();
      if (!accessToken) {
        throw new InstagramAuthenticationError(
          'Instagram authentication required. Use /auth/instagram/callback'
        );
      }

      // 2. Check token expiry (warn if < 10 days remaining)
      const remainingDays = await this.oauth.getRemainingDays();
      if (remainingDays < 10) {
        this.logger.warn(
          `Instagram token expires in ${remainingDays} days. Refresh soon!`,
          { refreshUrl: 'https://developers.facebook.com/docs/instagram-api/guides/access-tokens' }
        );
      }

      // 3. Check rate limits
      const canUpload = await this.rateLimiter.checkLimit('INSTAGRAM');
      if (!canUpload) {
        throw new RateLimitError(
          'Instagram daily quota exceeded (25 posts/day). Retry tomorrow.'
        );
      }

      // 4. Download video (or use provided URL if already hosted)
      const videoUrl = params.videoUrl;  // Instagram requires HTTPS URL

      // 5. Validate URL is HTTPS and accessible
      this.validateUrl(videoUrl);

      // 6. Optionally validate video locally before upload
      if (params.validateLocally) {
        const { path: videoPath } =
          await this.downloader.downloadVideo(videoUrl);

        const validation = await this.validator.validateForPlatform(
          videoPath,
          'INSTAGRAM'
        );
        if (!validation.isValid) {
          throw new ValidationError(
            `Video invalid for Instagram: ${validation.errors.join(', ')}`
          );
        }

        await this.cleanupTempFile(videoPath);
      }

      // 7. Get business account ID from token claims
      const businessAccountId = await this.oauth.getBusinessAccountId();

      // 8. Create media container
      const { containerId } = await this.createMediaContainer(
        businessAccountId,
        videoUrl,
        params.caption,
        accessToken
      );

      // 9. Poll until container is ready
      await this.pollUntilReady(
        containerId,
        businessAccountId,
        accessToken
      );

      // 10. Publish media container
      const { mediaId } = await this.publishMediaContainer(
        containerId,
        businessAccountId,
        accessToken
      );

      // 11. Fetch published permalink
      const { permalink } = await this.getMediaPermalink(
        mediaId,
        accessToken
      );

      // 12. Consume rate limit
      await this.rateLimiter.consumeToken('INSTAGRAM');

      const duration = Date.now() - startTime;

      this.logger.info('Instagram upload successful', {
        mediaId,
        caption: params.caption.substring(0, 50),
        duration: `${(duration / 1000).toFixed(1)}s`,
        permalink,
      });

      return {
        videoId: mediaId,
        url: permalink,
        platform: 'INSTAGRAM',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      };

    } catch (error) {
      this.logger.error('Instagram upload failed', {
        caption: params.caption.substring(0, 50),
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Create media container with video URL
   * Container must remain in "IN_PROGRESS" until published
   */
  private async createMediaContainer(
    businessAccountId: string,
    videoUrl: string,
    caption: string,
    accessToken: string
  ): Promise<{ containerId: string }> {
    const response = await this.httpClient.post(
      `https://graph.instagram.com/v19.0/${businessAccountId}/media`,
      {
        video_url: videoUrl,
        media_type: 'REELS',
        caption: caption,
        access_role: 'OWNER',
      },
      {
        params: { access_token: accessToken },
        headers: { 'Content-Type': 'application/json' },
      }
    ).toPromise();

    if (response.data.error) {
      throw new InstagramUploadError(
        `Container creation failed: ${response.data.error.message}`
      );
    }

    return { containerId: response.data.id };
  }

  /**
   * Poll media container until ready (upload_status = "FINISHED")
   * Instagram typically finishes in 1-3 minutes
   * Max wait: 10 minutes
   */
  private async pollUntilReady(
    containerId: string,
    businessAccountId: string,
    accessToken: string,
    maxAttempts: number = 60  // 60 * 10s = 10 minutes
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await this.httpClient.get(
        `https://graph.instagram.com/v19.0/${containerId}`,
        {
          params: {
            fields: 'upload_status,status_code',
            access_token: accessToken,
          },
        }
      ).toPromise();

      const uploadStatus = response.data.upload_status;

      if (uploadStatus === 'FINISHED') {
        return;
      }

      if (uploadStatus === 'ERROR') {
        throw new InstagramUploadError(
          `Container upload failed: ${response.data.status_code}`
        );
      }

      // Wait 10 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    throw new InstagramUploadError(
      'Container upload timeout (>10 minutes)'
    );
  }

  /**
   * Publish media container to make visible
   * This is the final step that makes the reel visible
   */
  private async publishMediaContainer(
    containerId: string,
    businessAccountId: string,
    accessToken: string
  ): Promise<{ mediaId: string }> {
    const response = await this.httpClient.post(
      `https://graph.instagram.com/v19.0/${businessAccountId}/media_publish`,
      { creation_id: containerId },
      {
        params: { access_token: accessToken },
        headers: { 'Content-Type': 'application/json' },
      }
    ).toPromise();

    if (response.data.error) {
      throw new InstagramUploadError(
        `Publish failed: ${response.data.error.message}`
      );
    }

    return { mediaId: response.data.id };
  }

  /**
   * Get media permalink (Instagram URL)
   */
  private async getMediaPermalink(
    mediaId: string,
    accessToken: string
  ): Promise<{ permalink: string }> {
    const response = await this.httpClient.get(
      `https://graph.instagram.com/v19.0/${mediaId}`,
      {
        params: {
          fields: 'permalink',
          access_token: accessToken,
        },
      }
    ).toPromise();

    return { permalink: response.data.permalink };
  }

  /**
   * Get media insights (engagement metrics)
   * Requires instagram_insights permission
   */
  async getMediaInsights(mediaId: string): Promise<MediaInsights> {
    try {
      const accessToken = await this.oauth.getAccessToken();

      const response = await this.httpClient.get(
        `https://graph.instagram.com/v19.0/${mediaId}/insights`,
        {
          params: {
            metric: 'engagement,impressions,reach,saved,shares',
            access_token: accessToken,
          },
        }
      ).toPromise();

      const insights: any = {};
      for (const item of response.data.data) {
        insights[item.name] = item.values[0]?.value || 0;
      }

      return {
        impressions: insights.impressions || 0,
        reach: insights.reach || 0,
        engagement: insights.engagement || 0,
        saves: insights.saved || 0,
        shares: insights.shares || 0,
      };
    } catch (error) {
      this.logger.warn('Failed to fetch Instagram insights', {
        mediaId,
        error: error.message,
      });

      return {
        impressions: 0,
        reach: 0,
        engagement: 0,
        saves: 0,
        shares: 0,
      };
    }
  }

  /**
   * Map to VideoStats format (consistent with other platforms)
   */
  async getVideoStats(mediaId: string): Promise<VideoStats> {
    const insights = await this.getMediaInsights(mediaId);

    return {
      views: insights.impressions,
      likes: 0,  // Instagram API doesn't expose likes directly
      comments: 0,
      shares: insights.shares,
    };
  }

  isConfigured(): boolean {
    return this.oauth.isAuthenticated();
  }

  private validateUrl(url: string): void {
    if (!url.startsWith('https://')) {
      throw new ValidationError('Instagram requires HTTPS video URL');
    }

    // Additional checks: URL must remain accessible during download
    // (validated by Instagram, but we can pre-check)
  }

  private async cleanupTempFile(path: string): Promise<void> {
    try {
      fs.unlinkSync(path);
    } catch (error) {
      this.logger.warn('Failed to cleanup temp file', { path });
    }
  }
}
```

#### Task 5.2: Instagram OAuth Token Refresh
**File**: `src/modules/publisher/auth/instagram-oauth.service.ts` (ENHANCE)

Add automatic token refresh:

```typescript
@Injectable()
export class InstagramOAuthService extends OAuth2BaseService {
  private tokenExpiresAt: Date | null = null;

  async ensureValidToken(): Promise<string> {
    // Check if token expires in < 10 days
    if (this.shouldRefreshToken()) {
      await this.refreshLongLivedToken();
    }

    return this.getAccessToken();
  }

  private shouldRefreshToken(): boolean {
    if (!this.tokenExpiresAt) return false;
    const daysUntilExpiry = (this.tokenExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry < 10;
  }

  async refreshLongLivedToken(): Promise<void> {
    const response = await this.httpClient.get(
      'https://graph.instagram.com/v19.0/refresh_access_token',
      {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: this.accessToken,
        },
      }
    ).toPromise();

    this.accessToken = response.data.access_token;
    this.tokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);

    // Save to Secrets Manager
    await this.secretsManager.setSecret(
      'instagram-access-token',
      this.accessToken
    );

    this.logger.info('Instagram token refreshed', {
      expiresAt: this.tokenExpiresAt.toISOString(),
    });
  }

  async getRemainingDays(): Promise<number> {
    if (!this.tokenExpiresAt) return -1;
    return Math.ceil(
      (this.tokenExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  }
}
```

#### Task 5.3: Instagram Error Handling & Tests
**File**: `src/modules/publisher/exceptions/instagram.exceptions.ts`

```typescript
export class InstagramAuthenticationError extends Error {}
export class InstagramUploadError extends Error {}
export class InstagramValidationError extends Error {}
export class InstagramTokenExpiredError extends Error {}
```

---

### Phase 6: Integration & Testing (Days 15-18, 24 hours)

#### Task 6.1: Update Publisher Service
**File**: `src/modules/publisher/publisher.service.ts` (UPDATE)

```typescript
// Add error handling and logging
// Test all three platforms in sequence
// Handle partial failures (2 succeed, 1 fails)
// Implement retry logic at service level
```

#### Task 6.2: Integration Tests
**File**: `test/integration/publisher/multi-platform.integration.spec.ts`

```typescript
describe('Multi-Platform Publishing Integration', () => {
  it('should publish to all platforms simultaneously', async () => {
    // Mock all three APIs
    // Trigger publish
    // Verify all three platform records created
    // Verify all three upload methods called with correct params
  });

  it('should handle partial platform failure', async () => {
    // Mock YouTube success, TikTok timeout, Instagram failure
    // Verify YouTube published
    // Verify TikTok retry attempted
    // Verify Instagram marked as failed
    // Verify resilience (1 failure doesn't stop others)
  });

  it('should respect rate limits per platform', async () => {
    // Setup rate limiters
    // Upload 6 videos to YouTube (succeed)
    // Attempt 7th (fail with rate limit)
    // Upload to TikTok (succeed)
  });

  it('should cleanup temp files on success and failure', async () => {
    // Verify temp files created
    // Trigger upload (success)
    // Verify temp files deleted
    // Trigger upload with error
    // Verify temp files still deleted
  });
});
```

#### Task 6.3: E2E Tests
**File**: `test/e2e/publishing.e2e-spec.ts` (UPDATE)

```typescript
describe('Publishing E2E Tests', () => {
  // Test with real API calls (if credentials available)
  // Use small test videos (< 5MB)
  // Verify publication records in database
  // Verify analytics sync triggered
});
```

#### Task 6.4: Update Publisher Module
**File**: `src/modules/publisher/publisher.module.ts`

```typescript
@Module({
  imports: [HttpModule, ConfigModule, DatabaseModule, SecretsModule],
  controllers: [PublisherController, AuthController],
  providers: [
    // Services
    PublisherService,
    YoutubeService,
    TiktokService,
    InstagramService,

    // Auth
    YoutubeOAuthService,
    TiktokOAuthService,
    InstagramOAuthService,

    // Utilities
    FileDownloaderService,
    VideoValidatorService,
    RateLimiterService,
    YouTubeAdapter,
    TikTokAdapter,
    InstagramAdapter,

    // Exceptions & Guards
    PublisherExceptionFilter,
  ],
  exports: [PublisherService],
})
export class PublisherModule {}
```

#### Task 6.5: Exception Filter & Interceptors
**File**: `src/modules/publisher/filters/publisher-exception.filter.ts`

```typescript
@Catch()
export class PublisherExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Handle platform-specific errors
    // Map to HTTP response codes
    // Log with platform context
    // Return user-friendly errors
  }
}
```

---

### Phase 7: Documentation & Deployment (Days 19-20, 16 hours)

#### Task 7.1: API Documentation
**File**: `docs/PUBLISHING-APIS-INTEGRATION.md` (NEW)

```markdown
# Publishing APIs Integration Guide

## Setup Instructions

### YouTube Shorts Publishing

1. Create Google Cloud Project
2. Enable YouTube Data API v3
3. Create OAuth2 credentials
4. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET
5. Run: `npm run auth:youtube`
6. Authorize in browser
7. Check `/auth/youtube/status` to verify

### TikTok Video Publishing

1. Apply for TikTok Content Posting API (tiktok.com/developers)
2. Wait 1-4 weeks for approval
3. Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET
4. Run: `npm run auth:tiktok`
5. Authorize in browser
6. Verify with `/auth/tiktok/status`

Note: Can use web automation as fallback while waiting

### Instagram Reels Publishing

1. Create Meta Developer account
2. Create Business app
3. Add Instagram product
4. Generate long-lived access token
5. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID
6. Token expires every 60 days - set calendar reminder!
7. Verify with `/auth/instagram/status`

## Rate Limits

| Platform | Limit | Window | Notes |
|----------|-------|--------|-------|
| YouTube | 6-20 videos | Day | Based on quota |
| TikTok | 30 videos | Day | 6 req/min |
| Instagram | 25 posts | Day | 10 Reels recommended |

## API Endpoints

### Publish Video
```
POST /publisher/publish
{
  "videoId": "vid_123",
  "platforms": ["YOUTUBE", "TIKTOK", "INSTAGRAM"],
  "caption": "Check out this product!",
  "hashtags": "#affiliate #review"
}
```

### Check Platform Status
```
GET /auth/youtube/status
GET /auth/tiktok/status
GET /auth/instagram/status
```

### Retrieve Publication
```
GET /publisher/publications/:id
```

## Error Handling

### Transient Errors (Retry)
- Network timeouts
- 5xx server errors
- Rate limit (after cooldown)

### Permanent Errors (Fail)
- Invalid credentials
- Video validation failure
- Unsupported format
- Account not authorized

## Monitoring

### Metrics to Track
- Upload success rate per platform
- Average upload duration
- Error rate by type
- Rate limit consumption

### Alerts
- Upload failures: Alert after 3 consecutive
- Token expiry: Alert 10 days before
- Rate limit approaching: Alert at 80%
- Quota exceeded: Alert immediately

## Testing

### Unit Tests
```bash
npm run test:unit -- publisher
```

### Integration Tests
```bash
npm run test:integration -- publisher
```

### E2E Tests
```bash
npm run test:e2e -- publishing
```

### Manual Testing
```bash
# Test YouTube upload
curl -X POST http://localhost:3000/publisher/publish \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "vid_123",
    "platforms": ["YOUTUBE"]
  }'
```
```

#### Task 7.2: Environment Variables
**File**: `.env.example` (UPDATE)

Already updated with publishing API variables. Ensure all fields documented.

#### Task 7.3: Deployment Configuration
**File**: `docs/deployment-guide.md` (UPDATE)

Add section:
```markdown
## Publishing APIs Setup

### Production Checklist

- [ ] YouTube OAuth2 credentials in AWS Secrets Manager
- [ ] TikTok credentials in AWS Secrets Manager
- [ ] Instagram long-lived token in AWS Secrets Manager
- [ ] Redirect URIs configured for production domain
- [ ] Rate limiters configured for Redis
- [ ] Monitoring and alerts configured
- [ ] Token refresh schedule set up
- [ ] Webhook URL for Instagram callback
- [ ] Test publish to each platform with small video
```

#### Task 7.4: Update README
**File**: `README.md` (UPDATE)

Change from:
```
**Status**: ✅ Production Ready (10/10)
```

To:
```
**Status**: ✅ Infrastructure Ready (10/10) | Publishing APIs Implemented
```

#### Task 7.5: Migration Guide
**File**: `docs/MIGRATION-FROM-MOCK-TO-REAL-APIS.md` (NEW)

```markdown
# Migration from Mock to Real Publishing APIs

## Overview
This guide explains how to migrate from mock publishing to real platform APIs.

## Steps

1. **Set up OAuth2 credentials** for each platform
2. **Configure environment variables** with real API keys
3. **Run auth callbacks** to obtain access tokens
4. **Update `AUTO_PUBLISH_ENABLED=true`** in .env
5. **Run tests** to verify integration
6. **Deploy** with confidence

## Rollback Plan

If issues occur:
1. Set `AUTO_PUBLISH_ENABLED=false`
2. Platform services will return to mock mode
3. Investigate logs in `logs/` directory
4. Fix issue
5. Re-enable and redeploy

## Troubleshooting

### YouTube Upload Fails
- Verify access token not expired: `GET /auth/youtube/status`
- Check quota not exceeded: `GET /metrics/youtube-quota`
- Verify video format: 9:16 aspect, ≤ 60 seconds

### TikTok Upload Fails
- Verify API approval received
- Check token validity: `GET /auth/tiktok/status`
- Verify daily quota (30 videos): `GET /metrics/tiktok-quota`
- Check file size: 5MB-128MB

### Instagram Upload Fails
- Verify token not expired: `GET /auth/instagram/status`
- Confirm token refreshed: Remaining days should show
- Check business account ID: `GET /auth/instagram/status`
- Verify HTTPS video URL accessible

## Post-Launch Monitoring

Monitor for:
- Upload success rate > 95%
- Average upload duration < 120s
- Error rate < 5%
- Token refresh happening automatically
```

---

## Testing Strategy

### Unit Tests (15 hours)
- OAuth2 flow
- File download/validation
- Rate limiting logic
- Platform adapters
- Error handling
- Video metadata extraction

**Coverage Target**: > 85%

### Integration Tests (8 hours)
- Multi-platform publishing
- Database transaction consistency
- Secrets Manager integration
- Circuit breaker behavior
- Retry logic

### E2E Tests (1-2 hours)
- Full workflow: download → validate → upload → track
- All three platforms
- Success and error scenarios

### Load Tests (2 hours)
- 50 concurrent uploads
- Rate limit enforcement
- Token refresh under load
- Memory/CPU usage

---

## Estimated Timeline

| Phase | Days | Hours | Completion |
|-------|------|-------|-----------|
| 1. Foundation & Auth | 3 | 24 | 15% |
| 2. File Handling | 2 | 16 | 35% |
| 3. YouTube | 3 | 20 | 60% |
| 4. TikTok | 3 | 20 | 75% |
| 5. Instagram | 3 | 20 | 90% |
| 6. Integration & Tests | 4 | 24 | 98% |
| 7. Docs & Deployment | 2 | 16 | 100% |
| **TOTAL** | **20** | **140** | **100%** |

*Parallel development possible. Actual time depends on API complexity and debugging.*

---

## Files to Create/Modify

### Create (15 new files)
```
src/modules/publisher/
├── auth/
│   ├── oauth2-base.service.ts
│   ├── youtube-oauth.service.ts
│   ├── tiktok-oauth.service.ts
│   ├── instagram-oauth.service.ts
│   └── auth.controller.ts
├── services/
│   ├── file-downloader.service.ts
│   ├── video-validator.service.ts
│   └── rate-limiter.service.ts
├── utils/
│   ├── platform-adapters.ts
│   └── file-util.ts
├── models/
│   ├── youtube-upload.model.ts
│   ├── tiktok-upload.model.ts
│   └── instagram-upload.model.ts
└── exceptions/
    ├── youtube.exceptions.ts
    ├── tiktok.exceptions.ts
    └── instagram.exceptions.ts
```

### Modify (8 files)
```
src/modules/publisher/
├── publisher.service.ts
├── services/youtube.service.ts (rewrite)
├── services/tiktok.service.ts (rewrite)
├── services/instagram.service.ts (rewrite)
├── publisher.module.ts
├── publisher.controller.ts
└── dto/publish-video.dto.ts

docs/
├── PUBLISHING-APIS-INTEGRATION.md (new)
├── MIGRATION-FROM-MOCK-TO-REAL-APIS.md (new)
└── deployment-guide.md (update)

Root:
├── .env.example (already updated)
└── README.md (update status)
```

### Tests (10 new files)
```
test/
├── unit/publisher/
│   ├── youtube.service.spec.ts
│   ├── tiktok.service.spec.ts
│   ├── instagram.service.spec.ts
│   ├── file-downloader.service.spec.ts
│   ├── video-validator.service.spec.ts
│   └── rate-limiter.service.spec.ts
├── integration/publisher/
│   ├── multi-platform.integration.spec.ts
│   ├── youtube.integration.spec.ts
│   ├── tiktok.integration.spec.ts
│   └── instagram.integration.spec.ts
└── e2e/
    └── publishing.e2e-spec.ts (update)
```

---

## Security Considerations

### Token Storage
- All tokens encrypted in AWS Secrets Manager
- Never log tokens
- Rotate refresh tokens per spec
- Monitor for token leaks

### Input Validation
- Validate video URLs (HTTPS only for Instagram)
- Sanitize captions for XSS
- Validate file sizes and codecs
- Rate limit by platform + user

### API Key Management
- Store in Secrets Manager
- Rotate on deployment
- Audit access logs
- Alert on failed auth attempts

### Error Logging
- Log stack traces for debugging
- Don't log sensitive data (tokens, passwords)
- Include request IDs for tracing
- Monitor error rate increases

---

## Rollout Strategy

### Stage 1: Development (Week 1-2)
- Implement with mock tests
- Run full test suite
- Code review

### Stage 2: Staging (Week 3)
- Deploy to staging environment
- Test with real API keys
- Monitor for 24 hours
- Performance testing

### Stage 3: Production (Week 4)
- Deploy to production
- Monitor error rate closely
- Start with low volume (10% of traffic)
- Gradual increase over 1 week

### Rollback Plan
- Keep mock mode available as fallback
- Circuit breaker for API failures
- Automatic retry with exponential backoff
- Alert on error rate > 5%

---

## Success Criteria

✅ **Functional**
- All three platforms accepting uploads
- Video published within 2 minutes
- Metadata correctly applied

✅ **Reliability**
- 95%+ upload success rate
- Automatic retry on transient errors
- Graceful failure on permanent errors

✅ **Performance**
- Average upload < 120 seconds
- Rate limits respected
- No memory leaks

✅ **Security**
- Tokens encrypted
- No credential leaks in logs
- Token refresh automatic

✅ **Monitoring**
- Upload metrics tracked
- Errors alerted
- Token expiry monitored
- Quota usage visible

---

## Known Limitations & Future Work

### Current (MVP)
- YouTube: Basic Shorts upload, no description editing after publish
- TikTok: FILE_UPLOAD method only, no draft editing
- Instagram: Container-based upload, 10-minute max wait

### Future Enhancements
- Video editing before/after upload
- Bulk scheduling
- A/B testing (different captions per platform)
- Advanced analytics dashboard
- Multi-account management
- Webhook-based status updates instead of polling
- Content moderation pre-upload
- AI caption generation per platform

---

## References

- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [TikTok Content Posting API](https://developers.tiktok.com/doc/content-posting-api)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [OAuth 2.0 Spec](https://tools.ietf.org/html/rfc6749)

---

**Plan Status**: Ready for Implementation
**Last Updated**: 2025-11-01
**Next Review**: After Phase 1 completion
