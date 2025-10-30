# API Integration Guide - AI Affiliate Empire

**Complete guide for integrating external APIs**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Required APIs](#required-apis)
3. [Optional APIs](#optional-apis)
4. [Setup Instructions](#setup-instructions)
5. [Cost Estimates](#cost-estimates)
6. [Troubleshooting](#troubleshooting)
7. [Mock Mode](#mock-mode)

---

## Overview

The AI Affiliate Empire integrates with multiple external APIs:

- **Required**: OpenAI, Anthropic Claude (for content generation)
- **Optional**: All others work with mock mode for development

### Mock Mode

Each API can operate in mock mode for development without API keys:
```bash
# Enable mock mode in .env
OPENAI_MOCK_MODE=true
ANTHROPIC_MOCK_MODE=true
ELEVENLABS_MOCK_MODE=true
PIKALABS_MOCK_MODE=true
AMAZON_MOCK_MODE=true
```

---

## Required APIs

### 1. OpenAI (GPT-4)

**Purpose**: Video script generation

**Getting API Key**:
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy the key (starts with `sk-proj-...`)

**Configuration**:
```bash
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MOCK_MODE=false
```

**Cost Estimate**:
- Model: GPT-4 Turbo
- Usage: ~50 scripts/day
- Cost per script: $0.02
- Monthly cost: ~$30

**Rate Limits**:
- Tier 1: 500 RPM, 30,000 TPM
- Tier 2: 5,000 RPM, 450,000 TPM

**Troubleshooting**:
```bash
# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check quota
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

### 2. Anthropic Claude

**Purpose**: Blog post generation

**Getting API Key**:
1. Go to https://console.anthropic.com/
2. Create account
3. Navigate to API Keys
4. Generate new key (starts with `sk-ant-...`)

**Configuration**:
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_MOCK_MODE=false
```

**Cost Estimate**:
- Model: Claude 3.5 Sonnet
- Usage: ~10 blogs/day
- Cost per blog: $0.05
- Monthly cost: ~$15

**Rate Limits**:
- Tier 1: 50 requests/minute
- Tier 2: 1,000 requests/minute

**Troubleshooting**:
```bash
# Test API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

## Optional APIs

### 3. ElevenLabs (Voice Synthesis)

**Purpose**: Text-to-speech for video narration

**Getting API Key**:
1. Go to https://elevenlabs.io/
2. Sign up for Creator plan ($28/month)
3. Go to Profile → API Keys
4. Copy API key

**Configuration**:
```bash
ELEVENLABS_API_KEY=your-key-here
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
ELEVENLABS_MOCK_MODE=false
```

**Cost Estimate**:
- Plan: Creator ($28/month)
- Includes: 100k characters/month
- Usage: ~50 voices/day (~500 chars each)
- Monthly usage: ~750k chars
- Additional cost: $0.30 per 1k chars over limit
- Total: ~$28-50/month

**Voice Options**:
- Adam (professional male): `EXAVITQu4vr4xnSDxMaL`
- Rachel (professional female): `21m00Tcm4TlvDq8ikWAM`
- Antoni (soft male): `ErXwobaYiN019PkySvjV`

**Troubleshooting**:
```bash
# Test API key
curl https://api.elevenlabs.io/v1/user \
  -H "xi-api-key: $ELEVENLABS_API_KEY"

# List available voices
curl https://api.elevenlabs.io/v1/voices \
  -H "xi-api-key: $ELEVENLABS_API_KEY"
```

---

### 4. Pika Labs (Video Generation)

**Purpose**: AI video generation from prompts

**Getting API Key**:
1. Go to https://pika.art/
2. Subscribe to Pro plan ($28/month)
3. Contact support for API access
4. Receive API key via email

**Configuration**:
```bash
PIKALABS_API_KEY=your-key-here
PIKALABS_API_URL=https://api.pikalabs.com/v1
PIKALABS_MOCK_MODE=false
```

**Cost Estimate**:
- Plan: Pro ($28/month)
- Includes: 2,000 videos
- Usage: ~50 videos/day
- Monthly usage: ~1,500 videos
- Cost per video: $0.014
- Total: $28/month (within limit)

**Video Specs**:
- Duration: Up to 60 seconds
- Resolution: 1080x1920 (9:16 vertical)
- Format: MP4
- Generation time: 30-90 seconds

**Troubleshooting**:
```bash
# Test API key (check with Pika support for exact endpoint)
curl https://api.pikalabs.com/v1/status \
  -H "Authorization: Bearer $PIKALABS_API_KEY"
```

---

### 5. Amazon Product Advertising API

**Purpose**: Product discovery and affiliate links

**Getting API Keys**:
1. Join Amazon Associates: https://affiliate-program.amazon.com/
2. Get approved (requires website/blog)
3. Apply for PA-API access (requires 3 sales)
4. Get credentials from AWS console

**Configuration**:
```bash
AMAZON_ACCESS_KEY=your-access-key
AMAZON_SECRET_KEY=your-secret-key
AMAZON_PARTNER_TAG=yourname-20
AMAZON_REGION=us-east-1
AMAZON_MOCK_MODE=false
```

**Cost**: Free (but requires qualifying sales)

**Rate Limits**:
- 1 request per second
- 8,640 requests per day

**Troubleshooting**:
```javascript
// Test in Node.js
const ProductAdvertisingAPIv1 = require('paapi5-nodejs-sdk');

const client = ProductAdvertisingAPIv1.ApiClient.instance;
client.accessKey = process.env.AMAZON_ACCESS_KEY;
client.secretKey = process.env.AMAZON_SECRET_KEY;
client.host = 'webservices.amazon.com';
client.region = 'us-east-1';

// Test search
const api = new ProductAdvertisingAPIv1.DefaultApi();
// ... (see Amazon PA-API docs)
```

---

### 6. YouTube Data API v3

**Purpose**: Upload videos to YouTube Shorts

**Getting Credentials**:
1. Go to https://console.cloud.google.com/
2. Create new project
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Download credentials JSON

**Configuration**:
```bash
YOUTUBE_CLIENT_ID=your-client-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/auth/youtube/callback
```

**Cost**: Free (10,000 quota units/day)

**Quota Usage**:
- Video upload: 1,600 units
- Daily uploads possible: ~6 videos

**OAuth Flow**:
```bash
# Run OAuth server
npm run youtube:auth

# Visit printed URL
# Authorize application
# Tokens saved automatically
```

**Troubleshooting**:
```bash
# Check API is enabled
gcloud services list --enabled --project=your-project-id | grep youtube

# Test with curl (after OAuth)
curl "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

### 7. TikTok Content Posting API

**Purpose**: Upload videos to TikTok

**Getting Access**:
1. Go to https://developers.tiktok.com/
2. Create developer account
3. Apply for Content Posting API access
4. Wait for approval (can take weeks)
5. Get client key and secret

**Configuration**:
```bash
TIKTOK_CLIENT_KEY=your-client-key
TIKTOK_CLIENT_SECRET=your-client-secret
```

**Cost**: Free

**Rate Limits**:
- 30 posts per day per user
- Subject to TikTok review

**Note**: Approval required. Use mock mode or Playwright automation as fallback.

---

### 8. Instagram Graph API

**Purpose**: Upload Reels to Instagram

**Getting Access**:
1. Create Facebook Developer account
2. Create app with Instagram Basic Display
3. Add Instagram Business account
4. Generate access token

**Configuration**:
```bash
INSTAGRAM_ACCESS_TOKEN=your-long-lived-token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your-account-id
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
```

**Cost**: Free

**Rate Limits**:
- 25 posts/day (all types combined)
- 10 Reels recommended

**Token Refresh**:
```bash
# Refresh long-lived token (60 days)
curl "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=$FACEBOOK_APP_ID&client_secret=$FACEBOOK_APP_SECRET&fb_exchange_token=$INSTAGRAM_ACCESS_TOKEN"
```

---

## Cost Estimates

### Minimal Setup (Development)
- OpenAI: $30/month
- Anthropic: $15/month
- **Total**: $45/month
- All other APIs in mock mode

### Full Production Setup
- OpenAI: $30/month
- Anthropic: $15/month
- ElevenLabs: $28/month
- Pika Labs: $28/month
- YouTube: Free
- TikTok: Free
- Instagram: Free
- Amazon PA-API: Free
- **Total**: ~$100/month

### At Scale (50+ videos/day)
- OpenAI: $50/month
- Anthropic: $25/month
- ElevenLabs: $50/month
- Pika Labs: $28/month (within limit)
- **Total**: ~$153/month

---

## Troubleshooting

### General Issues

**API Key Not Working**:
```bash
# Check if key is set
echo $OPENAI_API_KEY

# Verify in application
curl http://localhost:3000/health

# Check logs
docker-compose logs backend | grep -i "api"
```

**Rate Limit Exceeded**:
```bash
# Check current usage
# Each API has dashboard for monitoring

# Adjust retry logic in code
# Circuit breaker automatically backs off

# Enable mock mode temporarily
OPENAI_MOCK_MODE=true
```

**Authentication Errors**:
```bash
# OAuth tokens expired (YouTube, Instagram)
# Re-run OAuth flow

# API keys rotated
# Update .env with new keys

# Check API is enabled in provider dashboard
```

---

## Mock Mode

Mock mode allows development without API costs:

### Enable Mock Mode
```bash
# .env
OPENAI_MOCK_MODE=true
ANTHROPIC_MOCK_MODE=true
ELEVENLABS_MOCK_MODE=true
PIKALABS_MOCK_MODE=true
AMAZON_MOCK_MODE=true
```

### Mock Behavior
- **OpenAI**: Returns template scripts
- **Claude**: Returns template blog posts
- **ElevenLabs**: Returns silent audio file
- **Pika**: Returns placeholder video
- **Amazon**: Returns sample products

### Testing Real APIs
```bash
# Test one API at a time
OPENAI_MOCK_MODE=false  # Real API
ANTHROPIC_MOCK_MODE=true  # Mock

# Monitor costs in provider dashboard
```

---

## Best Practices

1. **Start with mock mode**: Test system before spending
2. **Monitor costs daily**: Check each API dashboard
3. **Set billing alerts**: Configure in each provider
4. **Rotate keys quarterly**: Security best practice
5. **Use environment-specific keys**: Separate dev/prod
6. **Cache API responses**: Reduce redundant calls
7. **Implement retries**: Handle transient failures
8. **Log all API calls**: Debug and cost tracking

---

## Support Resources

- **OpenAI**: https://help.openai.com/
- **Anthropic**: https://support.anthropic.com/
- **ElevenLabs**: https://help.elevenlabs.io/
- **Pika Labs**: support@pika.art
- **Amazon PA-API**: https://webservices.amazon.com/paapi5/documentation/
- **YouTube API**: https://developers.google.com/youtube/
- **TikTok**: https://developers.tiktok.com/
- **Instagram**: https://developers.facebook.com/docs/instagram-api/

---

**Last Updated**: 2025-10-31
**Status**: Active
**Maintainer**: Development Team
