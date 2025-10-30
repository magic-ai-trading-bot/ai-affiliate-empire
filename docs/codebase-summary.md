# Codebase Summary - AI Affiliate Empire

**Generated**: 2025-10-31
**Total Lines of Code**: ~6,611
**Language**: TypeScript
**Framework**: NestJS (Backend), Next.js (Frontend)

---

## Project Overview

AI Affiliate Empire is a fully autonomous affiliate marketing system that:
- Discovers and ranks products from affiliate networks
- Generates AI-powered content (videos and blogs)
- Publishes to multiple platforms (YouTube, TikTok, Instagram)
- Tracks analytics and optimizes ROI automatically
- Self-heals and scales based on performance

---

## Architecture Overview

### Technology Stack

**Backend**:
- **Framework**: NestJS (Node.js + TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Orchestration**: Temporal (durable workflows)
- **Caching**: Redis (planned)
- **Queue**: BullMQ (planned)

**Frontend**:
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom React components

**AI Services**:
- **Scripts**: OpenAI GPT-4
- **Blogs**: Anthropic Claude 3.5 Sonnet
- **Voice**: ElevenLabs
- **Video**: Pika Labs
- **Images**: DALL-E 3

**Infrastructure**:
- **Containerization**: Docker + Docker Compose
- **Hosting**: Fly.io (recommended)
- **Monitoring**: Grafana + Prometheus
- **Logging**: Winston

---

## Directory Structure

```
ai-affiliate-empire/
├── .husky/                    # Git hooks
│   └── commit-msg            # Conventional commits validation
├── .opencode/                # Open Code CLI agents
│   ├── agent/                # Specialized AI agents
│   │   ├── planner.md
│   │   ├── researcher.md
│   │   ├── tester.md
│   │   ├── debugger.md
│   │   ├── code-reviewer.md
│   │   ├── docs-manager.md
│   │   ├── git-manager.md
│   │   └── project-manager.md
│   └── command/              # Custom slash commands
│       ├── plan.md
│       ├── cook.md
│       ├── debug.md
│       ├── test.md
│       └── watzup.md
├── dashboard/                # Next.js dashboard
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   ├── revenue-chart.tsx
│   │   ├── stats-card.tsx
│   │   └── top-products.tsx
│   └── package.json
├── docs/                     # Documentation
│   ├── PROJECT-COMPLETE.md  # Project completion summary
│   ├── code-standards.md    # Coding conventions
│   ├── codebase-summary.md  # This file
│   ├── deployment-guide.md  # Production deployment
│   ├── design-guidelines.md # UI/UX guidelines
│   ├── project-overview-pdr.md # Product requirements
│   ├── project-roadmap.md   # Future plans
│   ├── system-architecture.md # Technical architecture
│   ├── temporal-orchestration.md # Workflow docs
│   ├── testing-guide.md     # Testing documentation
│   └── api-integration-guide.md # API setup guide
├── plans/                    # Implementation plans
│   ├── templates/           # Plan templates
│   └── reports/             # Agent communication
├── prisma/                   # Database schema & migrations
│   ├── schema.prisma        # Database models
│   ├── migrations/          # Migration history
│   └── seed.ts              # Database seeding
├── src/                      # Backend source code
│   ├── common/              # Shared utilities
│   │   ├── circuit-breaker/ # Fault tolerance
│   │   ├── config/          # Configuration
│   │   ├── database/        # Database connection
│   │   ├── encryption/      # Data encryption
│   │   ├── exceptions/      # Custom errors
│   │   ├── health/          # Health checks
│   │   └── logging/         # Winston logger
│   ├── modules/             # Feature modules
│   │   ├── analytics/       # Analytics & ROI tracking
│   │   ├── content/         # Content generation
│   │   ├── optimizer/       # Self-optimization
│   │   ├── orchestrator/    # Temporal integration
│   │   ├── product/         # Product discovery
│   │   ├── publisher/       # Multi-platform publishing
│   │   ├── reports/         # Reporting system
│   │   └── video/           # Video generation
│   ├── temporal/            # Temporal workflows
│   │   ├── activities/      # Temporal activities
│   │   ├── workflows/       # Workflow definitions
│   │   ├── client.ts        # Temporal client
│   │   └── worker.ts        # Temporal worker
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry
├── test/                     # Test suites
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   ├── e2e/                 # End-to-end tests
│   ├── fixtures/            # Test data
│   └── utils/               # Test utilities
├── .env.example             # Environment template
├── docker-compose.yml       # Docker orchestration
├── Dockerfile               # Backend container
├── nest-cli.json            # NestJS configuration
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
└── README.md                # Project documentation
```

---

## Core Modules

### 1. Product Module (`src/modules/product/`)

**Purpose**: Product discovery and ranking

**Key Components**:
- `product.service.ts` - Product CRUD operations
- `product-ranker.service.ts` - AI-powered product ranking
- `amazon.service.ts` - Amazon PA-API integration
- `product.controller.ts` - REST API endpoints

**Key Features**:
- Syncs products from Amazon PA-API
- Calculates trend score, profit score, virality score
- Ranks products by composite score
- Supports multiple affiliate networks

**Database Models**:
- `Product` - Product catalog
- `AffiliateNetwork` - Network configurations

---

### 2. Content Module (`src/modules/content/`)

**Purpose**: AI content generation

**Key Components**:
- `content.service.ts` - Content orchestration
- `script-generator.service.ts` - Video script generation
- `openai.service.ts` - OpenAI GPT-4 integration
- `claude.service.ts` - Anthropic Claude integration
- `content.controller.ts` - REST API endpoints

**Key Features**:
- Generates video scripts (60s format)
- Writes SEO-optimized blog posts
- Includes FTC disclosures
- Supports mock mode for development

**Database Models**:
- `Script` - Video scripts
- `Blog` - Blog posts

---

### 3. Video Module (`src/modules/video/`)

**Purpose**: Video production pipeline

**Key Components**:
- `video.service.ts` - Video orchestration
- `elevenlabs.service.ts` - Voice synthesis
- `pikalabs.service.ts` - Video generation
- `video-composer.service.ts` - Asset composition
- `video.controller.ts` - REST API endpoints

**Key Features**:
- Text-to-speech with ElevenLabs
- AI video generation with Pika Labs
- Thumbnail creation with DALL-E 3
- Vertical video format (9:16)

**Database Models**:
- `Video` - Video metadata
- `VideoAsset` - Video components

---

### 4. Publisher Module (`src/modules/publisher/`)

**Purpose**: Multi-platform content publishing

**Key Components**:
- `publisher.service.ts` - Publishing orchestration
- `youtube.service.ts` - YouTube Shorts
- `tiktok.service.ts` - TikTok publishing
- `instagram.service.ts` - Instagram Reels
- `publisher.controller.ts` - REST API endpoints

**Key Features**:
- Publishes to YouTube, TikTok, Instagram
- Respects platform rate limits
- Optimal scheduling per platform
- Retry logic for failures

**Database Models**:
- `Publication` - Published content tracking
- `PlatformMetrics` - Platform performance

---

### 5. Analytics Module (`src/modules/analytics/`)

**Purpose**: Metrics collection and ROI tracking

**Key Components**:
- `analytics.service.ts` - Analytics orchestration
- `metrics-collector.service.ts` - Platform metrics sync
- `roi-calculator.service.ts` - ROI calculations
- `performance-analyzer.service.ts` - Performance insights
- `analytics.controller.ts` - REST API endpoints

**Key Features**:
- Collects views, clicks, conversions
- Calculates revenue per product/platform
- Tracks costs per content piece
- Generates performance reports

**Database Models**:
- `ProductAnalytics` - Product performance
- `PlatformAnalytics` - Platform performance
- `Conversion` - Conversion tracking

---

### 6. Optimizer Module (`src/modules/optimizer/`)

**Purpose**: Self-optimization engine

**Key Components**:
- `optimizer.service.ts` - Optimization orchestration
- `strategy-optimizer.service.ts` - Strategy adjustments
- `auto-scaler.service.ts` - Content scaling
- `ab-testing.service.ts` - A/B testing
- `prompt-versioning.service.ts` - Prompt optimization
- `optimizer.controller.ts` - REST API endpoints

**Key Features**:
- Kills low-performing products (ROI < 0.5)
- Scales winners (ROI > 2.0)
- A/B tests prompts
- Optimizes content strategy

**Database Models**:
- `ABTest` - A/B test configurations
- `PromptVersion` - Prompt variations
- `OptimizationLog` - Optimization history

---

### 7. Orchestrator Module (`src/modules/orchestrator/`)

**Purpose**: Temporal workflow integration

**Key Components**:
- `orchestrator.service.ts` - Workflow management
- `orchestrator.controller.ts` - Workflow triggers

**Key Features**:
- Starts daily control loop
- Monitors workflow status
- Handles workflow failures
- Graceful degradation

---

### 8. Temporal Workflows (`src/temporal/`)

**Purpose**: Durable workflow orchestration

**Key Components**:
- `workflows/daily-control-loop.ts` - 24-hour automation
- `activities/index.ts` - Activity definitions
- `client.ts` - Temporal client
- `worker.ts` - Temporal worker

**Workflow Steps** (71 minutes):
1. Discover products (5 min)
2. Rank products (2 min)
3. Select top products (1 min)
4. Generate content (10 min)
5. Generate videos (30 min)
6. Publish multi-platform (15 min)
7. Collect analytics (5 min)
8. Optimize strategy (3 min)

---

## Common Utilities

### Circuit Breaker (`src/common/circuit-breaker/`)
- Fault tolerance for external APIs
- Automatic retry with exponential backoff
- Graceful degradation

### Encryption (`src/common/encryption/`)
- AES-256 encryption for sensitive data
- API key encryption in database

### Logging (`src/common/logging/`)
- Structured JSON logging with Winston
- Log levels: error, warn, info, debug
- Daily rotating log files

### Health Checks (`src/common/health/`)
- Database health
- External API health
- System metrics

---

## Database Schema (Prisma)

### Core Models (11 total)

1. **AffiliateNetwork** - Affiliate program configs
2. **Product** - Product catalog with scores
3. **Script** - Video scripts
4. **Blog** - Blog posts
5. **Video** - Video metadata
6. **VideoAsset** - Video components
7. **Publication** - Published content
8. **ProductAnalytics** - Product metrics
9. **PlatformAnalytics** - Platform metrics
10. **Conversion** - Conversion tracking
11. **ABTest** - A/B test configs

### Key Indexes
- `Product(status, trendScore)` - Ranking queries
- `Product(networkId, status)` - Network filtering
- `ProductAnalytics(createdAt)` - Time-series queries
- `Video(status)` - Status filtering

---

## API Endpoints (35+)

### Products
- `POST /products/sync` - Sync from Amazon
- `GET /products` - List products
- `GET /products/top` - Top performers

### Content
- `POST /content/scripts` - Generate script
- `POST /content/blogs` - Generate blog

### Videos
- `POST /videos` - Create video
- `GET /videos/:id` - Get video

### Publisher
- `POST /publisher/publish` - Publish content

### Analytics
- `GET /analytics/overview` - Dashboard
- `GET /analytics/revenue` - Revenue data
- `GET /analytics/top-products` - Top products
- `GET /analytics/platforms` - Platform comparison

### Optimizer
- `POST /optimizer/optimize` - Run optimization
- `GET /optimizer/recommendations` - Get recommendations
- `GET /optimizer/ab-tests` - A/B results

### Orchestrator
- `POST /orchestrator/start` - Start workflow
- `GET /orchestrator/status` - Workflow status

---

## Testing Infrastructure

### Test Coverage: 85%+

**Unit Tests** (`test/unit/`):
- Product ranking algorithm
- ROI calculator
- Temporal workflows
- Service layer logic

**Integration Tests** (`test/integration/`):
- API endpoints
- Database operations
- External API mocks

**E2E Tests** (`test/e2e/`):
- Complete workflows
- Multi-module integration

### Test Utilities
- Mock factories for all models
- Test database setup
- API testing helpers
- Temporal testing environment

---

## Configuration

### Environment Variables (100+ vars)

**Required**:
- `DATABASE_URL` - PostgreSQL connection
- `OPENAI_API_KEY` - Script generation
- `ANTHROPIC_API_KEY` - Blog generation

**Optional** (mock mode available):
- `ELEVENLABS_API_KEY` - Voice synthesis
- `PIKALABS_API_KEY` - Video generation
- `AMAZON_*` - Product discovery
- `YOUTUBE_*` - YouTube publishing
- `TIKTOK_*` - TikTok publishing
- `INSTAGRAM_*` - Instagram publishing

### Mock Mode
Each external API supports mock mode:
```bash
OPENAI_MOCK_MODE=true
ANTHROPIC_MOCK_MODE=true
ELEVENLABS_MOCK_MODE=true
PIKALABS_MOCK_MODE=true
AMAZON_MOCK_MODE=true
```

---

## Key Features Implemented

### Core Functionality
- ✅ Product discovery and ranking
- ✅ AI content generation (scripts, blogs)
- ✅ Video production pipeline
- ✅ Multi-platform publishing
- ✅ Analytics and ROI tracking
- ✅ Self-optimization engine

### Production Readiness
- ✅ Docker containerization
- ✅ Health checks
- ✅ Structured logging
- ✅ Error handling
- ✅ Rate limiting
- ✅ Data encryption
- ✅ Circuit breakers
- ✅ Comprehensive testing (85% coverage)

### Dashboard Features
- ✅ Real-time metrics
- ✅ Revenue charts (7-day trends)
- ✅ Top products leaderboard
- ✅ System health monitoring
- ✅ Manual workflow trigger
- ✅ Auto-refresh (30s)

---

## Code Quality Standards

### TypeScript
- Strict mode enabled
- Explicit type annotations
- No `any` types
- Interface-driven design

### Architecture
- Modular design (feature modules)
- Dependency injection (NestJS)
- Service layer pattern
- Repository pattern (Prisma)

### Error Handling
- Custom exception classes
- Global exception filter
- Structured error logging
- Graceful degradation

### Testing
- 85%+ code coverage
- Unit, integration, E2E tests
- Test-driven development
- Continuous integration

---

## Dependencies

### Core Dependencies
- `@nestjs/common` ^11.1.8
- `@nestjs/core` ^11.1.8
- `@prisma/client` ^6.18.0
- `@temporalio/workflow` ^1.13.1
- `openai` ^6.7.0
- `@anthropic-ai/sdk` ^0.68.0
- `axios` ^1.13.1

### Dev Dependencies
- `@nestjs/testing` ^11.1.8
- `jest` ^30.2.0
- `ts-jest` ^29.4.5
- `supertest` ^7.1.4
- `typescript` ^5.9.3

---

## Performance Metrics

### Throughput
- Content generation: 50 pieces/day
- Publishing: 50 publications/day
- Analytics sync: Hourly

### Latency
- Script generation: 10s
- Video generation: 90s
- Publishing: 10s per platform

### Availability
- System uptime: 99.5% target
- Workflow success: 95%+
- Self-healing: 90%+

---

## Cost Structure

### Fixed Costs: $86/month
- Pika Labs: $28
- ElevenLabs: $28
- Hosting: $30

### Variable Costs: $0.27 per content piece
- OpenAI: $0.02
- Claude: $0.05
- DALL-E: $0.04
- Pika: $0.014
- ElevenLabs: $0.01

### Monthly Total: ~$412
(50 pieces/day × 30 days × $0.27 + $86)

---

## Future Enhancements

1. Multi-account strategy (scale capacity)
2. Real-time ML optimization
3. Voice cloning for brand consistency
4. Additional affiliate networks
5. Advanced A/B testing with statistical significance
6. Redis caching layer
7. BullMQ job queue
8. GraphQL API option

---

## Development Workflow

### Local Development
```bash
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run start:dev
```

### Testing
```bash
npm test              # All tests
npm run test:unit     # Unit only
npm run test:e2e      # E2E only
npm run test:coverage # With coverage
```

### Production
```bash
docker-compose up -d  # Full stack
```

---

## Documentation

- `README.md` - Project overview
- `QUICKSTART.md` - Setup guide
- `docs/PROJECT-COMPLETE.md` - Completion summary
- `docs/code-standards.md` - Coding standards
- `docs/deployment-guide.md` - Deployment
- `docs/system-architecture.md` - Architecture
- `docs/testing-guide.md` - Testing
- `docs/api-integration-guide.md` - API setup

---

**Project Status**: ✅ Production Ready
**Last Updated**: 2025-10-31
**Maintainer**: Development Team
