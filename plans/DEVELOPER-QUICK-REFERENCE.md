# Publishing APIs - Developer Quick Reference

**Quick links to key information for implementation**

---

## YouTube Data API v3

### Authentication
```typescript
// OAuth2 flow
GET https://accounts.google.com/o/oauth2/v2/auth?
  client_id=XXX&
  redirect_uri=http://localhost:3000/auth/youtube/callback&
  scope=https://www.googleapis.com/auth/youtube&
  response_type=code&
  access_type=offline

// Token exchange
POST https://oauth2.googleapis.com/token
  - grant_type: authorization_code
  - code: {authorizationCode}
  - client_id: XXX
  - client_secret: XXX
  - redirect_uri: XXX
```

### Video Upload
```typescript
// 1. Initiate resumable upload
POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable
Headers:
  Authorization: Bearer {accessToken}
  X-Goog-Upload-Protocol: resumable
  X-Goog-Upload-Command: start
Body:
  {
    "snippet": {
      "title": "Product Review #Shorts",
      "description": "...",
      "tags": ["shorts"],
      "categoryId": "22",
      "defaultLanguage": "en"
    },
    "status": {
      "privacyStatus": "public",
      "madeForKids": false
    }
  }

Response: Location header contains upload URL

// 2. Upload video file
PUT {uploadUrl}
Headers:
  X-Goog-Upload-Command: finalize
Body: Binary video data

Response: { id: "videoId", ... }

// 3. Poll until processed
GET https://www.googleapis.com/youtube/v3/videos?
  part=processingDetails&id={videoId}

Wait for: processingStatus = "succeeded"
```

### Key Points
- Quota: 10,000 units/day, 1,600 units per upload = 6 videos/day
- Max file size: 256GB (effectively unlimited)
- Duration: ≤ 60 seconds for Shorts
- Aspect ratio: 9:16 (vertical)
- Add "#Shorts" to title/description for auto-classification
- Processing takes 30-90 seconds
- Rate limit: 50 uploads/day (hard platform limit)

### Error Codes
```
400: Invalid metadata, file format, or request
401: Unauthorized (invalid token)
403: quotaExceeded (daily limit reached)
404: Video not found
500-503: Server error (retry)
```

---

## TikTok Content Posting API

### Authentication
```typescript
// OAuth2 flow (requires Business Account)
GET https://www.tiktok.com/v2/oauth/authorize?
  client_key=XXX&
  redirect_uri=XXX&
  scope=video.upload,user.info.basic&
  response_type=code&
  state=XXX

// Token exchange
POST https://open.tiktokapis.com/v2/oauth/token/
  - client_key: XXX
  - client_secret: XXX
  - code: {authorizationCode}
  - grant_type: authorization_code
  - redirect_uri: XXX

Response: {
  access_token: "...",
  expires_in: 7200  // 2 hours
}
```

### Video Upload (Chunked)
```typescript
// 1. Initialize upload
POST https://open.tiktokapis.com/v2/post/publish/video/init/
Headers: Authorization: Bearer {accessToken}
Body: {
  "source": "FILE_UPLOAD",
  "chunk_size": 67108864,  // 64MB
  "total_size": {totalBytes},
  "filename": "video.mp4"
}

Response: { data: { upload_id: "...", upload_url: "..." } }

// 2. Upload chunks (5-64MB each, except last chunk)
PUT {upload_url}
Headers:
  Content-Range: bytes {start}-{end}/{total}
  Content-Length: {chunkSize}
Body: Binary chunk data

Repeat for each chunk. Upload URL expires in 1 hour.

// 3. Publish video
POST https://open.tiktokapis.com/v2/post/publish/video/
Body: {
  "source_info": {
    "source": "FILE_UPLOAD",
    "video": { "upload_id": "..." }
  },
  "post_info": {
    "title": "Amazing product! #shorts",  // Max 150 chars
    "description": "...",                 // Max 2200 chars
    "disable_comment": false,
    "disable_duet": false,
    "disable_stitch": false,
    "video_cover_timestamp_ms": 5000
  }
}

Response: {
  data: {
    publish_id: "...",
    video_id: "..."
  }
}
```

### Key Points
- Quota: 30 videos/day, 6 requests/minute per token
- Access token: 2-hour lifetime (need refresh for long sessions)
- File size: 5MB minimum, 128MB max (single chunk)
- Chunk size: 5-64MB (except last chunk up to 128MB)
- Upload timeout: 1 hour per session
- Aspect ratio: 9:16 recommended
- Duration: 3 seconds - 10 minutes
- Requires Business Account + API approval (1-4 weeks)

### Error Codes
```
400: Invalid request parameters
401: Unauthorized (invalid token)
429: Rate limit exceeded (6 req/min)
503: Service temporarily unavailable
```

---

## Instagram Graph API

### Authentication
```typescript
// Step 1: OAuth2 flow
GET https://www.instagram.com/oauth/authorize?
  client_id=XXX&
  redirect_uri=XXX&
  scope=instagram_basic,instagram_content_publish&
  response_type=code

// Step 2: Short-lived token (expires in 1 hour)
POST https://graph.instagram.com/v19.0/oauth/access_token
  - client_id: XXX
  - client_secret: XXX
  - grant_type: authorization_code
  - code: {code}
  - redirect_uri: XXX

Response: { access_token: "...", user_id: "..." }

// Step 3: Exchange for long-lived token (60 days)
GET https://graph.instagram.com/v19.0/access_token?
  grant_type=ig_refresh_token&
  access_token={shortLivedToken}&
  client_secret=XXX

Response: {
  access_token: "...",
  token_type: "bearer",
  expires_in: 5184000  // 60 days in seconds
}
```

### Reel Upload (Two-Step)
```typescript
// 1. Create media container
POST https://graph.instagram.com/v19.0/{igUserId}/media
Headers: Authorization: Bearer {longLivedToken}
Body: {
  "video_url": "https://...",  // Must be HTTPS, must remain accessible
  "media_type": "REELS",
  "caption": "Amazing product! #affiliate #review",
  "access_role": "OWNER"
}

Response: { id: "containerId", upload_status: "IN_PROGRESS" }

// 2. Poll until ready (typically 1-3 minutes)
GET https://graph.instagram.com/v19.0/{containerId}?
  fields=upload_status&
  access_token={longLivedToken}

Wait for: upload_status = "FINISHED"

// 3. Publish media container
POST https://graph.instagram.com/v19.0/{igUserId}/media_publish
Body: { "creation_id": "{containerId}" }

Response: { id: "mediaId" }

// 4. Get permalink
GET https://graph.instagram.com/v19.0/{mediaId}?
  fields=permalink&
  access_token={longLivedToken}
```

### Key Points
- Token lifetime: 60 days (MUST refresh before expiry!)
- Requires Business/Creator Account
- Video URL must be HTTPS and remain accessible
- Upload polling timeout: 10 minutes recommended
- Rate limit: 25 posts/day (recommend 10 for Reels)
- Aspect ratio: 9:16 recommended (5-90 seconds for tab visibility)
- Container format: MP4 (moov atom at front) or MOV
- Audio: AAC, 48kHz, mono/stereo

### Error Codes
```
400: Invalid video URL, missing fields, etc.
401: Unauthorized (invalid token)
403: Insufficient permissions
404: User/media not found
500-503: Server error (retry)
```

### Token Refresh (Before Expiry)
```typescript
// 10 days before expiry, refresh token:
GET https://graph.instagram.com/v19.0/refresh_access_token?
  grant_type=ig_refresh_token&
  access_token={currentToken}&
  client_secret=XXX

// Update stored token with new access_token
// expires_in will be 5184000 (60 days again)
```

---

## Platform Comparison

| Feature | YouTube | TikTok | Instagram |
|---------|---------|--------|-----------|
| **Auth Method** | OAuth2 (3-leg) | OAuth2 (3-leg) | OAuth2 (3-leg) |
| **Token Type** | access + refresh | access only | long-lived |
| **Token Lifetime** | ~1 hour | 2 hours | 60 days |
| **Daily Quota** | 6-20 videos | 30 videos | 25 posts |
| **Upload Method** | Resumable | Chunked (5-64MB) | Container |
| **Upload Timeout** | 5 min per video | 1 hour | 10 minutes |
| **Video Format** | MP4 (H.264) | MP4 (H.264) | MP4/MOV (H.264+AAC) |
| **Duration** | ≤ 60 seconds | 3s - 10 min | 5-90 seconds |
| **Aspect Ratio** | 9:16 | 9:16 | 9:16 |
| **File Size** | <256GB | 5-128MB | <5GB |
| **API Status** | Stable | New (approval needed) | Stable |
| **Test Status** | ✅ Tested | ⚠️ API approval pending | ✅ Tested |

---

## Rate Limiting

### Token Bucket Algorithm
```typescript
const limits = {
  YOUTUBE: {
    dailyTokens: 6,      // 6 uploads/day
    refillTime: 'day',   // Refill at midnight UTC
  },
  TIKTOK: {
    dailyTokens: 30,     // 30 uploads/day
    minuteTokens: 6,     // 6 requests/minute
    refillTime: 'day',   // Refill at midnight UTC
  },
  INSTAGRAM: {
    dailyTokens: 10,     // 10 Reels/day (conservative)
    refillTime: 'day',   // Refill at midnight UTC
  },
};

// Pseudocode
if (availableTokens > 0) {
  consumeToken(platform);
  proceedWithUpload();
} else {
  throwRateLimitError(
    `Daily quota exceeded. ${remainingTokens} available. Retry tomorrow.`
  );
}
```

---

## Video Validation

### ffprobe Metadata Extract
```bash
ffprobe -v error -select_streams v:0 -show_entries \
  stream=width,height,r_frame_rate,codec_name,codec_type \
  -of default=noprint_wrappers=1:nokey=1:noprint_wrappers=1 \
  input.mp4

# Output example:
# width=1080
# height=1920
# r_frame_rate=30/1
# codec_name=h264
# codec_type=video
```

### Validation Checklist
```
✓ Aspect ratio: Actual = Width/Height
  - YouTube: Must be 9:16 (±2% tolerance)
  - TikTok: Accepts 0.75-1.33, recommend 9:16
  - Instagram: Accepts 0.01-10, recommend 9:16

✓ Duration: Extract from ffprobe
  - YouTube: ≤ 60 seconds
  - TikTok: 3-600 seconds
  - Instagram: 5-5400 seconds

✓ Codecs: Extract from ffprobe
  - Video: h264 (all platforms accept)
  - Audio: aac (all platforms accept)

✓ Frame rate: Minimum 24 fps, maximum 60 fps

✓ File size: Check file system
  - YouTube: < 256GB (effectively unlimited)
  - TikTok: 5-128MB
  - Instagram: < 5GB

✓ Container: File extension
  - YouTube: MP4 only
  - TikTok: MP4 only
  - Instagram: MP4 or MOV
```

---

## Error Handling Strategy

### Transient Errors (Retry with Backoff)
```typescript
- Network timeout (ETIMEDOUT)
- DNS resolution failure (ENOTFOUND)
- Connection refused (ECONNREFUSED)
- 429 Too Many Requests
- 503 Service Unavailable
- 504 Gateway Timeout

Retry: Exponential backoff (1s, 2s, 4s, 8s)
Max attempts: 3
```

### Permanent Errors (Fail Immediately)
```typescript
- 400 Bad Request (invalid format)
- 401 Unauthorized (invalid token)
- 403 Forbidden (permission denied)
- 404 Not Found
- 405 Method Not Allowed
- Validation errors (invalid video)
- Auth errors (credentials missing)

No retry. Log and fail.
```

### Platform-Specific Errors
```typescript
// YouTube
400: Invalid snippet/status fields
403: quotaExceeded → Rate limit error
401: Invalid token → Re-authenticate

// TikTok
400: source_info missing, invalid title length
401: Invalid access_token → Re-authenticate
429: Rate limit (6 req/min) → Wait and retry

// Instagram
400: video_url not HTTPS, caption too long
401: Invalid access_token → Re-authenticate
400: upload_status=ERROR → Permanent failure
```

---

## Environment Variables Needed

```bash
# YouTube
YOUTUBE_CLIENT_ID=xxx.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=xxx
YOUTUBE_REDIRECT_URI=http://localhost:3000/auth/youtube/callback

# TikTok
TIKTOK_CLIENT_KEY=xxx
TIKTOK_CLIENT_SECRET=xxx

# Instagram
INSTAGRAM_ACCESS_TOKEN=xxx
INSTAGRAM_BUSINESS_ACCOUNT_ID=xxx

# Storage
STORAGE_DIR=/tmp/media
STORAGE_CLEANUP_ENABLED=true
STORAGE_CLEANUP_DAYS=7

# Rate limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

---

## Testing Fixtures

### Small Test Videos
```bash
# 1MB test video (suitable for all platforms)
ffmpeg -f lavfi -i testsrc=s=1080x1920:d=5 \
  -f lavfi -i sine=f=1000:d=5 \
  -c:v libx264 -crf 28 \
  -c:a aac -b:a 64k \
  test_video_1mb.mp4

# 10MB test video (TikTok minimum)
ffmpeg -f lavfi -i testsrc=s=1080x1920:d=30 \
  -f lavfi -i sine=f=1000:d=30 \
  -c:v libx264 -crf 23 \
  -c:a aac -b:a 128k \
  test_video_10mb.mp4
```

### API Response Mocks
```typescript
// YouTube upload response
{
  "kind": "youtube#video",
  "etag": "...",
  "id": "ABC123DEF456",
  "snippet": { /* video metadata */ },
  "processingDetails": {
    "processingStatus": "succeeded"
  }
}

// TikTok publish response
{
  "data": {
    "publish_id": "1234567890",
    "video_id": "9876543210"
  },
  "error": null
}

// Instagram media response
{
  "id": "123456789",
  "permalink": "https://instagram.com/reel/ABC123/",
  "upload_status": "FINISHED"
}
```

---

## Common Issues & Solutions

### YouTube
| Issue | Cause | Solution |
|-------|-------|----------|
| 403 quotaExceeded | Daily quota (1,600 units) exceeded | Wait until next day or request quota increase |
| 401 Unauthorized | Token expired or invalid | Refresh token or re-authenticate |
| Video still processing after 90s | Normal latency | Increase polling timeout to 120s |
| #Shorts not applied | Missing from title/description | Ensure "#Shorts" in title AND description |

### TikTok
| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Invalid token | Token expired (2-hour lifetime) | Refresh access token |
| 429 Rate limit | >6 requests/minute | Implement rate limiter with 10s backoff |
| 400 Invalid title | Title > 150 characters | Truncate to 150 chars max |
| Upload URL expired | >1 hour since init | Re-initialize upload and restart |

### Instagram
| Issue | Cause | Solution |
|-------|-------|----------|
| 400 video_url invalid | Not HTTPS or URL unreachable | Ensure HTTPS, video hosted on CDN |
| 401 Unauthorized | Token expired (60 days) | Refresh token before 60-day mark |
| Container stuck in PROGRESS | Server issue or invalid video | Retry entire upload in 1 hour |
| 403 Forbidden | Permission denied, not Business Account | Switch to Business Account |

---

## Monitoring Checklist

```
✓ Upload success rate (target: 95%)
✓ Average upload duration (target: < 120s)
✓ Error rate by type (target: < 5%)
✓ Rate limit consumption (alert at 80%)
✓ Token expiry tracking (alert 10 days before)
✓ Failed publication retries (track attempts)
✓ Platform availability status
✓ File size distribution
✓ Video metadata validation failures
✓ OAuth2 authentication failures
```

---

**Last Updated**: 2025-11-01
**For Full Details**: See `plans/20251101-publishing-apis-integration-plan.md`
