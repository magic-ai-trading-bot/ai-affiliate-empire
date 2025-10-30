# 🚀 Quick Start Guide - AI Affiliate Empire

Get your autonomous affiliate empire running in 15 minutes!

---

## Option 1: Docker (Recommended - Fastest)

### Prerequisites
- Docker & Docker Compose installed
- API keys for services (see below)

### Steps

1. **Clone and Configure**
```bash
git clone https://github.com/magic-ai-trading-bot/ai-affiliate-empire.git
cd ai-affiliate-empire
cp .env.example .env
```

2. **Add API Keys to `.env`**
```bash
# Minimum required
OPENAI_API_KEY="sk-..."              # Get from platform.openai.com
ANTHROPIC_API_KEY="sk-ant-..."       # Get from console.anthropic.com

# Amazon Associates (optional - uses mocks if not provided)
AMAZON_ACCESS_KEY="..."
AMAZON_SECRET_KEY="..."
AMAZON_PARTNER_TAG="..."
```

3. **Start Everything**
```bash
docker-compose up -d
```

4. **Access Applications**
- **Dashboard**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api
- **Temporal UI**: http://localhost:8233

5. **Initialize System** (First Time Only)
```bash
# Create affiliate network
curl -X POST http://localhost:3000/products/networks \
  -H "Content-Type: application/json" \
  -d '{"name": "Amazon Associates", "type": "AMAZON"}'

# Sync initial products
curl -X POST http://localhost:3000/products/sync \
  -H "Content-Type: application/json" \
  -d '{"category": "trending"}'
```

6. **Start Daily Automation**
- Go to dashboard: http://localhost:3001
- Click "Start Daily Loop" button
- Watch your empire grow! 📈

---

## Option 2: Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Temporal CLI (optional)

### Steps

1. **Clone Repository**
```bash
git clone https://github.com/magic-ai-trading-bot/ai-affiliate-empire.git
cd ai-affiliate-empire
```

2. **Setup Database**
```bash
# Create database
createdb ai_affiliate_empire

# Install dependencies
npm install

# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

3. **Configure Environment**
```bash
cp .env.example .env
# Edit .env and add your API keys
```

4. **Start Backend** (Terminal 1)
```bash
npm run start:dev
```

5. **Start Dashboard** (Terminal 2)
```bash
cd dashboard
npm install
npm run dev
```

6. **Optional: Start Temporal Worker** (Terminal 3)
```bash
# Install Temporal CLI
brew install temporal  # macOS
# or download from temporalio.io

# Start Temporal server
temporal server start-dev

# In new terminal, start worker
npm run temporal:worker
```

7. **Access Applications**
- **Dashboard**: http://localhost:3001
- **Backend**: http://localhost:3000
- **API Docs**: http://localhost:3000/api
- **Temporal UI**: http://localhost:8233

---

## 🔑 Getting API Keys

### Required Keys

1. **OpenAI** (Script Generation)
   - Go to: https://platform.openai.com/api-keys
   - Create new secret key
   - Copy to `.env` as `OPENAI_API_KEY`
   - Cost: ~$0.02/script

2. **Anthropic Claude** (Blog Writing)
   - Go to: https://console.anthropic.com/
   - Create API key
   - Copy to `.env` as `ANTHROPIC_API_KEY`
   - Cost: ~$0.05/blog

### Optional Keys (System uses mocks if not provided)

3. **Pika Labs** (Video Generation)
   - Go to: https://pika.art/
   - Subscribe to Pro plan ($28/month)
   - Get API key from settings
   - Cost: $0.014/video (2000 videos/month)

4. **ElevenLabs** (Voice Synthesis)
   - Go to: https://elevenlabs.io/
   - Subscribe to Creator plan ($28/month)
   - Get API key
   - Cost: $0.01/voice

5. **Amazon Associates** (Product Discovery)
   - Go to: https://affiliate-program.amazon.com/
   - Apply for PA-API access
   - Get credentials from AWS console
   - Free (with affiliate commissions)

6. **YouTube Data API** (Publishing)
   - Go to: https://console.cloud.google.com/
   - Enable YouTube Data API v3
   - Create OAuth 2.0 credentials
   - Cost: Free (10,000 quota/day)

7. **TikTok API** (Publishing)
   - Go to: https://developers.tiktok.com/
   - Apply for Content Posting API access
   - Note: Requires approval
   - Cost: Free

---

## 🎯 First Steps After Setup

### 1. Check Dashboard
Visit http://localhost:3001 to see:
- Total revenue (mock data initially)
- Active products
- Videos ready
- System status

### 2. Explore API Documentation
Visit http://localhost:3000/api to:
- See all available endpoints
- Test API calls
- View request/response schemas

### 3. Trigger Manual Workflow
```bash
# Via API
curl -X POST http://localhost:3000/orchestrator/start

# Or use Dashboard UI
# Click "Start Daily Loop" button
```

### 4. Monitor Temporal (if running)
Visit http://localhost:8233 to:
- See workflow execution
- Check activity status
- Debug failures

### 5. Check Logs
```bash
# Docker
docker-compose logs -f backend

# Local
# Check terminal where npm run start:dev is running
```

---

## 🧪 Testing the System

### Run Test Suite

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Watch mode (auto-rerun on changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Product Discovery
```bash
curl -X POST http://localhost:3000/products/sync \
  -H "Content-Type: application/json" \
  -d '{"category": "Electronics"}'
```

### Test Content Generation
```bash
curl -X POST http://localhost:3000/content/scripts \
  -H "Content-Type: application/json" \
  -d '{
    "productTitle": "Smart Watch",
    "price": 199.99,
    "features": ["Heart rate", "GPS", "Waterproof"]
  }'
```

### Check Analytics
```bash
curl http://localhost:3000/analytics/overview
```

### Access Monitoring

- **Grafana Dashboard**: http://localhost:3002 (admin/admin)
- **Prometheus Metrics**: http://localhost:9090
- **Temporal UI**: http://localhost:8233

---

## 🐛 Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
pg_isready

# Verify DATABASE_URL in .env
echo $DATABASE_URL

# Reset database
npm run prisma:reset
```

### Docker Issues
```bash
# View logs
docker-compose logs backend

# Restart services
docker-compose restart

# Rebuild
docker-compose up --build
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### API Keys Not Working
- Verify keys are correct in `.env`
- Check API key has sufficient credits
- System uses mocks if keys invalid (check logs)
- Enable mock mode: Set `*_MOCK_MODE=true` in `.env`

### Tests Failing
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma client
npm run prisma:generate

# Reset test database
DATABASE_URL="postgresql://user:pass@localhost:5432/test_db" npm run prisma:migrate:dev
```

---

## 📚 Next Steps

1. **Read Documentation**
   - [System Architecture](docs/system-architecture.md)
   - [Deployment Guide](docs/deployment-guide.md)
   - [Project Complete](docs/PROJECT-COMPLETE.md)

2. **Customize System**
   - Adjust product selection criteria
   - Modify content templates
   - Configure publishing schedule

3. **Monitor Performance**
   - Check daily workflow results
   - Review analytics dashboard
   - Optimize based on ROI

4. **Scale to Production**
   - Deploy to Fly.io or Railway
   - Add more affiliate networks
   - Implement multi-account strategy

---

## 💡 Pro Tips

- **Start with mocks**: Test the system without API costs
- **Monitor costs**: Track API usage in each platform's dashboard
- **Test content**: Review generated content before publishing
- **Gradual scale**: Start with 5 products, scale to 50+
- **Check analytics daily**: Identify winners early

---

## 🆘 Need Help?

- **Documentation**: `/docs` folder
- **API Reference**: http://localhost:3000/api
- **GitHub Issues**: [Create an issue](https://github.com/magic-ai-trading-bot/ai-affiliate-empire/issues)

---

**You're all set! Your autonomous affiliate empire is ready to generate revenue. 🎉**
