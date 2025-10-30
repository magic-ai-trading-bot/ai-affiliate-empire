# AI Affiliate Empire - Setup Guide

**Complete setup instructions for deploying the autonomous affiliate system**

---

## 📋 Prerequisites

### Required Software
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))
- **Redis** 7+ (Optional for Phase 1)
- **Git** ([Download](https://git-scm.com/))

### Required API Accounts

#### 1. AI Services
- **OpenAI** - [platform.openai.com](https://platform.openai.com/)
  - Create API key
  - Enable GPT-4 Turbo access
  - Add payment method ($5-20/month estimated)

- **Anthropic Claude** - [console.anthropic.com](https://console.anthropic.com/)
  - Create API key
  - Claude 3.5 Sonnet access

- **ElevenLabs** - [elevenlabs.io](https://elevenlabs.io/)
  - Sign up for Creator plan ($28/month)
  - Get API key
  - Select default voice ID

- **Pika Labs** - [pika.art](https://pika.art/)
  - Sign up for subscription ($28/month)
  - Request API access (may take time)

#### 2. Affiliate Networks
- **Amazon Associates** - [affiliate-program.amazon.com](https://affiliate-program.amazon.com/)
  - Apply for affiliate account
  - Get approval (requires existing website/channel)
  - Generate Associate Tag
  - Request Product Advertising API access

#### 3. Social Media Platforms
- **YouTube** - [console.cloud.google.com](https://console.cloud.google.com/)
  - Create Google Cloud project
  - Enable YouTube Data API v3
  - Create OAuth2 credentials
  - Add authorized redirect URIs

- **TikTok** - [developers.tiktok.com](https://developers.tiktok.com/)
  - Register as developer
  - Create app
  - Request Content Posting API access (requires approval)

- **Instagram** - [developers.facebook.com](https://developers.facebook.com/)
  - Create Facebook App
  - Add Instagram Basic Display
  - Get instagram_content_publish permission
  - Convert personal account to Business/Creator

---

## 🚀 Installation

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/ai-affiliate-empire.git
cd ai-affiliate-empire
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup PostgreSQL Database

```bash
# Create database
createdb ai_affiliate_empire

# Or using psql
psql -U postgres
CREATE DATABASE ai_affiliate_empire;
\q
```

### 4. Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required Environment Variables:**

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ai_affiliate_empire"

# OpenAI
OPENAI_API_KEY="sk-proj-..."
OPENAI_MODEL="gpt-4-turbo-preview"

# Anthropic Claude
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"

# ElevenLabs
ELEVENLABS_API_KEY="..."
ELEVENLABS_VOICE_ID="..."

# Pika Labs
PIKALABS_API_KEY="..."

# Amazon Associates
AMAZON_ACCESS_KEY="..."
AMAZON_SECRET_KEY="..."
AMAZON_PARTNER_TAG="your-tag-20"
AMAZON_REGION="us-east-1"

# YouTube
YOUTUBE_CLIENT_ID="...apps.googleusercontent.com"
YOUTUBE_CLIENT_SECRET="..."
YOUTUBE_REDIRECT_URI="http://localhost:3000/auth/youtube/callback"

# TikTok
TIKTOK_CLIENT_KEY="..."
TIKTOK_CLIENT_SECRET="..."

# Instagram
INSTAGRAM_ACCESS_TOKEN="..."
INSTAGRAM_BUSINESS_ACCOUNT_ID="..."
```

### 5. Initialize Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Seed with test data
npm run prisma:seed
```

### 6. Start Development Server

```bash
npm run start:dev
```

Server will start on `http://localhost:3000`

API Documentation: `http://localhost:3000/api/docs`

---

## 🧪 Testing the System

### 1. Health Check

```bash
curl http://localhost:3000
```

Expected response:
```json
{
  "status": "ok",
  "message": "AI Affiliate Empire API is running",
  "timestamp": "2025-10-31T..."
}
```

### 2. Sync Products from Amazon

```bash
curl -X POST http://localhost:3000/products/sync/amazon \
  -H "Content-Type: application/json" \
  -d '{"keywords": "trending electronics"}'
```

### 3. Generate Video Script

```bash
curl -X POST http://localhost:3000/content/script/generate \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "YOUR_PRODUCT_ID",
    "language": "en",
    "tone": "engaging"
  }'
```

### 4. Generate Video

```bash
curl -X POST http://localhost:3000/video/generate \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "YOUR_VIDEO_ID"
  }'
```

### 5. Publish to Platforms

```bash
curl -X POST http://localhost:3000/publisher/publish \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "YOUR_VIDEO_ID",
    "platforms": ["YOUTUBE", "TIKTOK", "INSTAGRAM"]
  }'
```

---

## 📊 Prisma Studio (Database GUI)

```bash
npm run prisma:studio
```

Opens at `http://localhost:5555`

---

## 🏗️ Production Deployment

### Using Docker

```bash
# Build image
docker build -t ai-affiliate-empire .

# Run container
docker run -p 3000:3000 \
  --env-file .env \
  ai-affiliate-empire
```

### Using Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
fly launch

# Set secrets
fly secrets set OPENAI_API_KEY="sk-..."
fly secrets set ANTHROPIC_API_KEY="sk-ant-..."
# ... set all required secrets

# Deploy
fly deploy
```

---

## 🔧 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -U postgres -d ai_affiliate_empire -c "SELECT 1"
```

### Build Errors

```bash
# Clear build cache
rm -rf dist node_modules
npm install
npm run build
```

### API Key Issues

Check if API keys are correctly set:

```bash
# OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Anthropic
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

---

## 📚 Next Steps

1. **Phase 2**: Setup Temporal for autonomous orchestration
2. **Phase 3**: Configure analytics tracking
3. **Phase 4**: Implement self-optimization algorithms
4. **Phase 5**: Deploy to production

See `docs/project-roadmap.md` for complete timeline.

---

## 🆘 Support

- **Issues**: https://github.com/yourusername/ai-affiliate-empire/issues
- **Discussions**: https://github.com/yourusername/ai-affiliate-empire/discussions
- **Documentation**: `./docs/`

---

**Status**: Phase 1 Foundation Complete ✅

**Next**: Implement Temporal orchestration for 24hr autonomous control loop
