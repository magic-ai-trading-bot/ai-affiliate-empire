# API Credentials Setup Guide - AI Affiliate Empire

**Complete guide for obtaining and configuring production API credentials**

Last Updated: 2025-11-01 | Status: Active | Version: 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [API Credentials Reference](#api-credentials-reference)
4. [Detailed Setup Instructions](#detailed-setup-instructions)
5. [Cost Analysis](#cost-analysis)
6. [Rate Limits & Quotas](#rate-limits--quotas)
7. [Testing Procedures](#testing-procedures)
8. [Production Deployment](#production-deployment)
9. [Credential Management](#credential-management)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers all 7 APIs required for production deployment:

| API | Purpose | Cost/Month | Status | Required |
|-----|---------|-----------|--------|----------|
| OpenAI (GPT-4) | Script & blog generation | $30-50 | Production | ✓ Yes |
| ElevenLabs | Voice generation | $28-50 | Production | ✓ Yes |
| Pika Labs | Video generation | $28 | Production | ✓ Yes |
| YouTube Data API | Publishing shorts | Free (10k quota) | Production | ✓ Yes |
| TikTok Content API | Publishing videos | Free | Production | ✓ Yes |
| Instagram Graph API | Publishing reels | Free | Production | ✓ Yes |
| Cloudflare R2 | Video storage | ~$5-10 | Production | ✓ Yes |

**Total Production Cost**: ~$100-140/month (without overage)

---

## Quick Start

### For Developers (Mock Mode)

```bash
# Clone repository
git clone <repo-url>
cd ai-affiliate-empire

# Copy example environment
cp .env.example .env

# Enable mock mode for development
cat >> .env << EOF
OPENAI_MOCK_MODE=true
ELEVENLABS_MOCK_MODE=true
PIKALABS_MOCK_MODE=true
AMAZON_MOCK_MODE=true
EOF

# Start development
npm install
docker-compose up -d
npm run dev
```

### For Production Setup

```bash
# Follow each API section below to obtain credentials
# Then update .env with real API keys (never commit!)

# Validate credentials before deployment
./scripts/setup/validate-api-credentials.sh

# Deploy to production
npm run build
npm run start:prod
```

---

## API Credentials Reference

### Quick Credential Checklist

```
REQUIRED BEFORE PRODUCTION:
□ OPENAI_API_KEY - sk-proj-...
□ OPENAI_MODEL - gpt-4o (or current model)
□ ELEVENLABS_API_KEY - ...
□ ELEVENLABS_VOICE_ID - EXAVITQu4vr4xnSDxMaL (or custom)
□ PIKALABS_API_KEY - ...
□ PIKALABS_API_URL - https://api.pikalabs.com/v1
□ YOUTUBE_CLIENT_ID - ...apps.googleusercontent.com
□ YOUTUBE_CLIENT_SECRET - ...
□ YOUTUBE_REDIRECT_URI - http://localhost:3000/auth/youtube/callback (update for production)
□ TIKTOK_CLIENT_KEY - ...
□ TIKTOK_CLIENT_SECRET - ...
□ INSTAGRAM_ACCESS_TOKEN - (long-lived)
□ INSTAGRAM_BUSINESS_ACCOUNT_ID - ...
□ FACEBOOK_APP_ID - ...
□ FACEBOOK_APP_SECRET - ...
□ R2_ACCOUNT_ID - ...
□ R2_ACCESS_KEY_ID - ...
□ R2_SECRET_ACCESS_KEY - ...
□ R2_BUCKET_NAME - ai-affiliate-videos
□ R2_PUBLIC_URL - https://...
```

---

## Detailed Setup Instructions

### 1. OpenAI (GPT-4) - Script Generation

**Purpose**: AI-powered video script and blog post generation for content creation

**Account Type Required**: OpenAI Platform Account with billing enabled

#### Step-by-Step Setup

1. **Create OpenAI Account**
   - Visit https://platform.openai.com/signup
   - Use email (business recommended)
   - Complete email verification
   - Add phone number for verification

2. **Enable Billing**
   - Go to https://platform.openai.com/account/billing/overview
   - Add payment method (credit card or PayPal)
   - Set spending limit: $100-200/month recommended
   - Confirm billing enabled before proceeding

3. **Generate API Key**
   - Navigate to https://platform.openai.com/account/api-keys
   - Click "Create new secret key"
   - Name it: `ai-affiliate-empire-prod` (for tracking)
   - Copy immediately (only shown once)
   - Store securely in password manager

4. **Configure Application**
   ```bash
   # Add to .env
   OPENAI_API_KEY=sk-proj-your-key-here
   OPENAI_MODEL=gpt-4o
   OPENAI_MOCK_MODE=false
   ```

**Cost Estimation**
- Input: $0.0025 per 1K tokens (GPT-4o)
- Output: $0.01 per 1K tokens (GPT-4o)
- Average script: 500 tokens input, 1000 tokens output = ~$0.01/script
- Average blog: 1000 tokens input, 2000 tokens output = ~$0.02/blog
- 50 scripts/day + 10 blogs/day = ~$0.70/day = $21/month
- **Recommended budget**: $50/month

**Rate Limits**
- Tier 1 (new account): 500 requests/min, 30,000 tokens/min
- Tier 2 (after 48 hours): 5,000 requests/min, 450,000 tokens/min
- Tier 3 (after monthly spend): Higher limits

**Required Permissions**
- Create completions
- Read usage statistics
- No special scopes needed

**Monitoring**
- Dashboard: https://platform.openai.com/account/usage/overview
- Set billing alerts in settings
- Monitor daily usage

**Testing**
```bash
# Test API key validity
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-proj-YOUR_KEY"

# Should return list of models including gpt-4-turbo-preview
```

---

---

### 3. ElevenLabs - Voice Generation

**Purpose**: Text-to-speech voice synthesis for video narration

**Account Type Required**: ElevenLabs Creator or Professional Plan

#### Step-by-Step Setup

1. **Create ElevenLabs Account**
   - Visit https://elevenlabs.io/
   - Sign up with email
   - Verify email address
   - Create username

2. **Subscribe to Creator Plan**
   - Go to Settings → Subscription
   - Select "Creator" plan ($28/month)
   - Add payment method
   - Confirm subscription

3. **Generate API Key**
   - Navigate to Settings → API Keys
   - Click "Generate new API key"
   - Copy key immediately
   - Store securely

4. **Configure Application**
   ```bash
   # Add to .env
   ELEVENLABS_API_KEY=your-api-key
   ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
   ELEVENLABS_MOCK_MODE=false
   ```

**Available Voices**
```
Professional Voices (recommended for business):
- Adam (male): EXAVITQu4vr4xnSDxMaL
- Rachel (female): 21m00Tcm4TlvDq8ikWAM
- Antoni (soft male): ErXwobaYiN019PkySvjV
- Bella (warm female): EXAVITQu4vr4xnSDxMaL
- Roger (gruff male): CwhRBWXzGAHq8TW4Xc5d

Check full list at: https://api.elevenlabs.io/v1/voices
```

**Cost Estimation**
- Plan: Creator ($28/month)
- Includes: 100,000 characters/month
- Average voice: ~500 characters (1 min audio)
- 50 voices/day = 25,000 characters/day = ~750,000 characters/month
- Overage: $0.30 per 1K characters
- **Estimated cost**: $28-50/month

**Rate Limits**
- Creator Plan: 30 concurrent requests, 100k chars/month
- Professional Plan: Unlimited

**Monitoring**
- Dashboard: https://elevenlabs.io/
- Monitor character usage in Settings
- Track overages

**Testing**
```bash
# Test API key validity
curl https://api.elevenlabs.io/v1/user \
  -H "xi-api-key: YOUR_KEY"

# List available voices
curl https://api.elevenlabs.io/v1/voices \
  -H "xi-api-key: YOUR_KEY"
```

---

### 4. Pika Labs - Video Generation

**Purpose**: AI video generation from text prompts

**Account Type Required**: Pika Labs Pro Membership

#### Step-by-Step Setup

1. **Create Pika Account**
   - Visit https://pika.art/
   - Sign up with email
   - Verify email
   - Complete onboarding

2. **Subscribe to Pro Plan**
   - Go to Settings → Membership
   - Select "Pro" plan ($28/month)
   - Add payment method
   - Includes 2,000 video generations/month

3. **Request API Access**
   - Email: support@pika.art
   - Subject: "API Access Request"
   - Message: Request API access for content generation
   - Wait for approval (usually 2-3 business days)
   - Receive API key via email

4. **Configure Application**
   ```bash
   # Add to .env
   PIKALABS_API_KEY=your-api-key
   PIKALABS_API_URL=https://api.pikalabs.com/v1
   PIKALABS_MOCK_MODE=false
   ```

**Video Specifications**
- Duration: Up to 60 seconds
- Resolution: 1080x1920 (vertical/Shorts format)
- Format: MP4
- Frame rate: 24 FPS
- Generation time: 30-90 seconds

**Cost Estimation**
- Plan: Pro ($28/month)
- Includes: 2,000 video generations/month
- Average usage: 50 videos/day = ~1,500/month
- Cost per video: $0.014
- **Total cost**: $28/month (within plan limit)

**Rate Limits**
- Pro Plan: ~2,000 videos/month (~66/day)
- 1 video per request
- Queue-based processing

**Monitoring**
- Dashboard: https://pika.art/dashboard
- Monitor monthly usage
- Plan upgrade if exceeding limit

**Testing**
```bash
# Test API key (check with Pika support for exact endpoint)
curl https://api.pikalabs.com/v1/status \
  -H "Authorization: Bearer YOUR_KEY"
```

---

### 5. YouTube Data API v3 - Publishing

**Purpose**: Upload and manage YouTube Shorts

**Account Type Required**: Google Cloud Project with YouTube Data API enabled

#### Step-by-Step Setup

1. **Create Google Cloud Project**
   - Visit https://console.cloud.google.com/
   - Click "Create Project"
   - Name: `ai-affiliate-empire-youtube`
   - Wait for creation

2. **Enable YouTube Data API**
   - In Cloud Console, search for "YouTube Data API v3"
   - Click on it
   - Click "Enable"
   - Wait for activation

3. **Create OAuth 2.0 Credentials**
   - Go to "Credentials" in left menu
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted, create OAuth consent screen first:
     - User Type: External
     - Add required fields
     - Add yourself as test user
   - Application type: "Desktop application"
   - Name: `ai-affiliate-youtube`
   - Click Create
   - Download JSON file (save securely)

4. **Extract Credentials**
   ```bash
   # From downloaded JSON file, extract:
   YOUTUBE_CLIENT_ID=your-id.apps.googleusercontent.com
   YOUTUBE_CLIENT_SECRET=your-secret
   ```

5. **Configure Application**
   ```bash
   # Add to .env
   YOUTUBE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   YOUTUBE_CLIENT_SECRET=your-client-secret
   YOUTUBE_REDIRECT_URI=http://localhost:3000/auth/youtube/callback
   # For production, update REDIRECT_URI to your domain
   ```

**OAuth Flow Setup**
```bash
# First time setup only - authorizes app to access YouTube
npm run youtube:auth

# Follow the printed URL to authorize
# App will save refresh token automatically
# Future API calls use saved token
```

**Cost Estimation**
- API Access: Free
- Quota: 10,000 units/day
- Video upload: 1,600 units per video
- Daily videos possible: ~6-8 videos
- Cost: $0 (free tier sufficient)

**Rate Limits**
- 10,000 quota units/day
- Upload quota: 1,600 units/upload
- Metadata quota: 100 units/update

**Required Scopes**
- `youtube.upload` - Upload videos
- `youtube.readonly` - Read channel info
- `userinfo.email` - User identification

**Monitoring**
- Google Cloud Console → Quotas & System Limits
- Monitor daily quota usage
- Set up billing alerts

**Testing**
```bash
# After OAuth setup, test with:
curl "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 6. TikTok Content Posting API

**Purpose**: Publish videos to TikTok

**Account Type Required**: TikTok Developer Account with approved API access

#### Step-by-Step Setup

**IMPORTANT**: TikTok API approval is competitive and can take weeks. Consider as Phase 2.

1. **Create TikTok Developer Account**
   - Visit https://developers.tiktok.com/
   - Sign up as developer
   - Link business account
   - Verify email

2. **Request API Access**
   - Go to "My Apps"
   - Click "Create an app"
   - App type: "Content Posting API"
   - Answer screening questions:
     - What is your app for? (describe affiliate content automation)
     - How will you use it? (detail publishing schedule)
     - Monthly content volume? (50-100 videos)
   - Submit for review
   - **Wait**: Usually 1-4 weeks

3. **Upon Approval - Extract Credentials**
   - Check email for approval notification
   - Get from TikTok Developer Portal:
     ```
     TIKTOK_CLIENT_KEY=...
     TIKTOK_CLIENT_SECRET=...
     ```

4. **Configure Application**
   ```bash
   # Add to .env
   TIKTOK_CLIENT_KEY=your-client-key
   TIKTOK_CLIENT_SECRET=your-client-secret
   TIKTOK_MOCK_MODE=false # Remove after approval
   ```

**Alternative**: Playwright Web Automation (during waiting period)
- If API approval is slow, use Playwright to automate web uploads
- Fully supported in current implementation
- Configure in environment variables

**Cost Estimation**
- API Access: Free
- No rate limiting for approved developers

**Rate Limits**
- Approved: 30 videos/day per account
- Subject to TikTok review

**Required Scopes**
- `video.upload` - Upload videos
- `user.info.basic` - User identification

**Monitoring**
- TikTok Developer Portal dashboard
- Monitor daily uploads

**Testing** (After approval)
```bash
# Get access token (OAuth 2.0 flow)
curl -X POST https://open.tiktokapis.com/v1/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_key": "YOUR_CLIENT_KEY",
    "client_secret": "YOUR_CLIENT_SECRET",
    "grant_type": "client_credentials"
  }'
```

---

### 7. Instagram Graph API - Publishing

**Purpose**: Publish Reels and content to Instagram

**Account Type Required**: Meta/Facebook App with Instagram Business Account

#### Step-by-Step Setup

1. **Create Meta Developer Account**
   - Visit https://developers.facebook.com/
   - Sign up with email
   - Verify email
   - Create app

2. **Setup Instagram App**
   - Go to "My Apps" → "Create App"
   - App type: "Business"
   - Name: `ai-affiliate-instagram`
   - Purpose: "Instagram Reels Publishing"

3. **Configure Instagram Basic Display**
   - In App, go to "Products"
   - Add "Instagram Basic Display"
   - Add "Instagram Graph API"
   - Configure OAuth Redirect URIs:
     ```
     http://localhost:3000/auth/instagram/callback
     https://yourdomain.com/auth/instagram/callback (for production)
     ```

4. **Connect Instagram Business Account**
   - Settings → Basic
   - Get App ID and App Secret
   - In Instagram, link your business account

5. **Generate Long-Lived Access Token**
   ```bash
   # Get short-lived token first (via OAuth)
   # Then exchange for long-lived token:
   curl -i -X GET "https://graph.instagram.com/v18.0/oauth/access_token?grant_type=ig_refresh_token&access_token=YOUR_ACCESS_TOKEN"
   ```

6. **Configure Application**
   ```bash
   # Add to .env
   INSTAGRAM_ACCESS_TOKEN=your-long-lived-token
   INSTAGRAM_BUSINESS_ACCOUNT_ID=your-account-id
   FACEBOOK_APP_ID=your-app-id
   FACEBOOK_APP_SECRET=your-app-secret
   ```

**Get Business Account ID**
```bash
# After getting access token:
curl -X GET \
  "https://graph.instagram.com/v18.0/me?fields=ig_user_id,username" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Cost Estimation**
- API Access: Free
- No usage charges

**Rate Limits**
- 25 posts/day (all types)
- 10 Reels recommended
- Subject to review

**Token Refresh**
```bash
# Long-lived tokens expire in 60 days
# Refresh before expiry:
curl -i -X GET \
  "https://graph.instagram.com/v18.0/oauth/access_token?grant_type=ig_refresh_token&access_token=LONG_LIVED_TOKEN"
```

**Required Permissions**
- `instagram_business_basic`
- `instagram_business_content_publish`
- `pages_read_engagement`

**Monitoring**
- Meta Business Suite: https://business.facebook.com/
- Monitor API quota usage
- Token expiry tracking

**Testing**
```bash
# Test access token validity
curl -X GET \
  "https://graph.instagram.com/v18.0/me?fields=id,username" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 8. Cloudflare R2 - Video Storage

**Purpose**: Scalable, S3-compatible video storage

**Account Type Required**: Cloudflare Account with R2 enabled

#### Step-by-Step Setup

1. **Create Cloudflare Account**
   - Visit https://dash.cloudflare.com/
   - Sign up with email
   - Verify email
   - Add domain (optional)

2. **Enable R2 Storage**
   - In Dashboard, go to "R2"
   - Click "Enable R2"
   - Confirm billing info
   - R2 pricing: $0.015/GB stored, $0.01/GB download

3. **Create R2 Bucket**
   - Click "Create bucket"
   - Name: `ai-affiliate-videos`
   - Region: Recommended (auto)
   - No CORS needed (handle in app)
   - Create bucket

4. **Generate API Token**
   - Go to "Manage R2 API tokens"
   - Click "Create API token"
   - Permissions:
     - ✓ Object Read
     - ✓ Object Write
     - ✓ Object Delete
   - Bucket: Specific - select `ai-affiliate-videos`
   - TTL: 1 year
   - Copy credentials

5. **Extract and Configure**
   ```bash
   # From API token, extract:
   R2_ACCOUNT_ID=your-account-id
   R2_ACCESS_KEY_ID=your-access-key
   R2_SECRET_ACCESS_KEY=your-secret-key
   R2_BUCKET_NAME=ai-affiliate-videos

   # Get public URL (for streaming)
   # Format: https://<bucket-name>.<account-id>.r2.cloudflarestorage.com
   # Or custom domain if set up
   R2_PUBLIC_URL=https://ai-affiliate-videos.abc123.r2.cloudflarestorage.com
   ```

6. **Configure Application**
   ```bash
   # Add to .env
   R2_ACCOUNT_ID=your-account-id
   R2_ACCESS_KEY_ID=your-access-key
   R2_SECRET_ACCESS_KEY=your-secret-key
   R2_BUCKET_NAME=ai-affiliate-videos
   R2_PUBLIC_URL=https://your-public-url
   ```

**Optional: Custom Domain**
- Go to R2 settings
- Add custom domain
- Point DNS records to Cloudflare
- Use custom domain in R2_PUBLIC_URL

**Cost Estimation**
- Storage: $0.015/GB/month
- Download (egress): $0.01/GB
- For 500 videos (200MB each = 100GB):
  - Storage: $1.50/month
  - Egress: Depends on views (estimate $5-20/month)
  - **Total**: ~$5-10/month

**Performance**
- Ultra-fast CDN delivery
- No egress fees to Cloudflare IP ranges
- Video optimization automatic

**Monitoring**
- Cloudflare Dashboard → R2
- Monitor storage usage
- Monitor egress bandwidth

**Testing**
```bash
# Test S3-compatible API
# Using AWS CLI configured for R2:
aws s3 ls s3://ai-affiliate-videos \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com

# Upload test file
aws s3 cp test.mp4 s3://ai-affiliate-videos/test.mp4 \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com
```

---

## Cost Analysis

### Minimal Setup (Development)
```
OpenAI (scripts + blogs) $30/month
─────────────────────────────
TOTAL:                   $30/month
```

### Standard Setup (Early Production)
```
OpenAI (scripts + blogs) $30/month
ElevenLabs (voice)       $28/month
Pika Labs (video)        $28/month
Cloudflare R2 (storage)  $5/month
YouTube (free)           $0/month
TikTok (free)            $0/month
Instagram (free)         $0/month
─────────────────────────────
TOTAL:                   $91/month
```

### Full Production Setup (50-100 videos/day)
```
OpenAI (scripts + blogs) $50/month
ElevenLabs (voice)       $50/month
Pika Labs (video)        $28/month
Cloudflare R2            $10/month
YouTube (free)           $0/month
TikTok (free)            $0/month
Instagram (free)         $0/month
─────────────────────────────
TOTAL:                   $138/month
```

### ROI Calculation
- Cost per video: ~$3.30 (at full production)
- Average affiliate revenue per view: $0.001-0.005
- Need 600-3,300 views per video to break even
- Platform averages:
  - YouTube Shorts: 1-10K views/week for new creators
  - TikTok: 5-50K views/week
  - Instagram Reels: 1-5K views/week

**Expected Revenue at Scale**:
- 100 videos/day × $0.003 average/view × 1,000 views = $300/day
- $300/day × 30 days = $9,000/month
- Minus costs ($138) = **$8,862/month net**

---

## Rate Limits & Quotas

### Daily/Monthly Limits

| API | Rate Limit | Daily Capacity | Notes |
|-----|-----------|----------------|-------|
| OpenAI | 500 RPM (T1), 5K RPM (T2) | 500+ requests | Tier increases with spend |
| ElevenLabs | 30 concurrent | 100K chars/month | Creator plan |
| Pika Labs | 2K/month | 66-70/day | Within plan |
| YouTube | 10K units/day | 6-8 videos | 1,600 units per upload |
| TikTok | 30/day | 30 videos | After approval |
| Instagram | 25/day total | 10 Reels recommended | All post types combined |
| R2 | Unlimited | Unlimited | Pay per usage |

### Quotas Setup

Each API with limits should have monitoring:

```bash
# Example: Monitor OpenAI daily usage
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.daily_costs'
```

---

## Testing Procedures

### Pre-Production Validation

Use the provided validation script:

```bash
# Make script executable
chmod +x ./scripts/setup/validate-api-credentials.sh

# Run validation
./scripts/setup/validate-api-credentials.sh

# Expected output:
# ✓ OpenAI API: Valid
# ✗ ElevenLabs API: Invalid key
# etc.
```

### Individual API Testing

#### OpenAI Test
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.data | length'
# Should return: number of available models (20+)
```


#### ElevenLabs Test
```bash
curl https://api.elevenlabs.io/v1/user \
  -H "xi-api-key: $ELEVENLABS_API_KEY" | jq '.subscription.tier'
# Should return subscription tier (creator, professional, etc.)
```

#### Pika Labs Test
```bash
curl https://api.pikalabs.com/v1/status \
  -H "Authorization: Bearer $PIKALABS_API_KEY"
# Should return 200 with status info
```

#### YouTube Test (requires OAuth)
```bash
curl "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true" \
  -H "Authorization: Bearer $YOUTUBE_ACCESS_TOKEN" | jq '.items[0].snippet.title'
# Should return your channel name
```

#### Instagram Test
```bash
curl -X GET \
  "https://graph.instagram.com/v18.0/me?fields=id,username" \
  -H "Authorization: Bearer $INSTAGRAM_ACCESS_TOKEN" | jq '.username'
# Should return your Instagram business account username
```

#### R2 Test
```bash
aws s3 ls s3://ai-affiliate-videos \
  --endpoint-url https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com
# Should list bucket contents
```

### Load Testing

```bash
# Test with actual requests before production
npm run test:integration -- --suite=api-integration

# Monitor error rates and response times
# Expected: < 200ms avg response time
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All 8 API keys obtained and validated
- [ ] Credentials stored in AWS Secrets Manager (recommended)
- [ ] Billing enabled on all paid APIs
- [ ] Spending limits configured (recommended: 2x estimated monthly)
- [ ] Rate limit quotas reviewed
- [ ] Monitoring/alerting setup for each API
- [ ] Credential rotation policy documented
- [ ] Emergency procedures documented
- [ ] Load tests passed
- [ ] Team trained on credential handling

### Deployment Steps

1. **Upload Secrets to AWS Secrets Manager**
   ```bash
   # Generate secrets file locally
   ./scripts/setup/generate-secrets.sh --env production

   # Upload to AWS (manually or via script)
   aws secretsmanager create-secret \
     --name ai-affiliate-empire/production/api-keys \
     --secret-string file://api-keys.json
   ```

2. **Enable Secrets Manager in .env**
   ```bash
   AWS_SECRETS_MANAGER_ENABLED=true
   AWS_REGION=us-east-1
   SECRET_NAME_PREFIX=ai-affiliate-empire/production
   ```

3. **Deploy Application**
   ```bash
   npm run build
   npm run start:prod

   # Or using Docker
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Verify Production Connectivity**
   ```bash
   npm run test:api-connectivity

   # Should show: All APIs connected ✓
   ```

### Post-Deployment

- Monitor all APIs for connectivity
- Check usage metrics in each provider dashboard
- Review first 24 hours of logs
- Monitor cost trends
- Verify content generation pipeline works end-to-end

---

## Credential Management

### Security Best Practices

1. **Storage**
   - Never commit .env files to git
   - Use AWS Secrets Manager for production
   - Encrypt .env files locally with git-crypt or similar
   - Use password manager for personal keys

2. **Rotation Policy**
   - Rotate API keys every 90 days
   - Keep previous key active for 1 week during rotation
   - Document rotation dates
   - Automate where possible

3. **Access Control**
   - Limit API key access to essential personnel
   - Use IAM roles for production deployments
   - Enable API key logging/auditing
   - Set specific rate limits per key

4. **Monitoring**
   - Monitor all API usage patterns
   - Alert on unusual activity (>2x normal usage)
   - Track failed authentication attempts
   - Review provider dashboards daily

### Credential Rotation Example

```bash
# Step 1: Generate new key in provider (e.g., OpenAI)
# Step 2: Update AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id ai-affiliate-empire/production/openai \
  --secret-string "{\"api_key\":\"new-key\"}"

# Step 3: Verify old key still works (grace period)
# Step 4: Update .env in production deployment
# Step 5: Restart application services
# Step 6: Revoke old key after 1 week
```

---

## Troubleshooting

### Common Issues

#### "Invalid API Key" Error

**Problem**: API key rejected or not found

**Solutions**:
1. Verify key is copied correctly (no spaces/truncation)
2. Check key hasn't been revoked in provider dashboard
3. Confirm key is set in .env: `echo $OPENAI_API_KEY`
4. Generate new key and test immediately
5. Check API hasn't been disabled in provider

#### "Rate Limit Exceeded"

**Problem**: Too many requests to API

**Solutions**:
1. Check current usage in provider dashboard
2. Reduce request frequency temporarily
3. Enable mock mode for non-essential APIs
4. Request rate limit increase from provider
5. Implement exponential backoff in code (already done)

#### "Billing Issue"

**Problem**: API returns billing/payment errors

**Solutions**:
1. Check billing enabled in provider account
2. Verify payment method is active
3. Check spending limit is sufficient
4. Update payment method if expired
5. Contact provider support if still failing

#### "OAuth Token Expired"

**Problem**: YouTube/Instagram tokens return 401

**Solutions**:
1. For YouTube: Re-run `npm run youtube:auth`
2. For Instagram: Refresh token using endpoint (see section 7)
3. Update .env with new token
4. Restart application
5. Set calendar reminder for token expiry (60 days for Instagram)

#### "Connection Timeout"

**Problem**: API calls timing out

**Solutions**:
1. Check internet connectivity
2. Verify API endpoint URLs are correct
3. Check provider status page for outages
4. Increase timeout in code (default: 30s)
5. Enable mock mode temporarily

### Debug Commands

```bash
# View full API error details
LOG_LEVEL=debug npm run dev

# Test specific API connection
npm run test:api openai

# Monitor live API usage
watch -n 5 'curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq'

# Check DNS resolution
nslookup api.openai.com

# Check certificate validity
openssl s_client -connect api.openai.com:443 -showcerts
```

### Support Resources

| API | Support URL | Response Time |
|-----|------------|----------------|
| OpenAI | https://help.openai.com/ | 24-48 hours |
| ElevenLabs | https://help.elevenlabs.io/ | 12-24 hours |
| Pika Labs | support@pika.art | 24-48 hours |
| Google Cloud | https://cloud.google.com/support | Varies by plan |
| TikTok | https://developers.tiktok.com/support | 48-72 hours |
| Meta | https://developers.facebook.com/support | Varies by plan |
| Cloudflare | https://support.cloudflare.com/ | 24 hours |

---

## FAQ

**Q: Can I use free tiers for production?**
A: Partially. YouTube, TikTok, and Instagram are free. OpenAI needs a paid tier for production volumes. ElevenLabs and Pika Labs have no free tiers but offer affordable plans.

**Q: What happens if an API goes down?**
A: The application uses circuit breakers and fallback mechanisms. Content generation will queue and retry. Published content won't be affected.

**Q: How often should I rotate credentials?**
A: Every 90 days for production. More frequently if you suspect compromise. Document all rotations.

**Q: Can I use the same API key for multiple deployments?**
A: Not recommended. Generate separate keys for dev/staging/production. Easier to manage and audit.

**Q: What if I exceed rate limits?**
A: APIs queue requests or return 429 errors. The application automatically backs off and retries. Monitor usage to prevent consistent limit-hitting.

**Q: How do I handle API key compromise?**
A: 1) Immediately revoke key in provider, 2) Generate new key, 3) Update .env, 4) Restart services, 5) Review audit logs, 6) Monitor for abuse.

---

**Last Updated**: 2025-11-01
**Maintained By**: Development Team
**Next Review**: 2025-12-01
