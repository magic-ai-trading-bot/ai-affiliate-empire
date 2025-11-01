# AI Affiliate Empire

![Production Ready](https://img.shields.io/badge/status-production%20ready-brightgreen)
![Production Score](https://img.shields.io/badge/readiness-10%2F10-brightgreen)
![Test Coverage](https://img.shields.io/badge/coverage-80%25-brightgreen)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

**Fully autonomous AI-powered affiliate marketing system** that discovers products, generates video + written content, publishes across multiple platforms, tracks conversions, and self-optimizes—all without human intervention.

**Target**: $10,000+/month in affiliate revenue

**Status**: ✅ Production Ready (10/10) | ✅ 80% Test Coverage | ✅ Docker Deployed

## What It Does

```
DISCOVER PRODUCTS → RANK BY ROI → GENERATE CONTENT → PUBLISH MULTI-PLATFORM →
TRACK ANALYTICS → OPTIMIZE STRATEGY → SCALE WINNERS → REPEAT DAILY
```

1. **Discovers** affiliate products automatically
2. **Ranks** by profit potential (AI + social trends)
3. **Generates** video scripts, voiceovers, videos, thumbnails, blogs
4. **Publishes** to YouTube Shorts, TikTok, Instagram Reels, blog
5. **Tracks** views, clicks, conversions, revenue
6. **Learns** from performance data
7. **Scales** winners, kills losers autonomously

## Tech Stack

- **Backend**: NestJS + Temporal (durable workflows)
- **Database**: PostgreSQL + Prisma
- **Video**: Pika Labs ($28/month for 2000 videos)
- **AI**: GPT-4 Turbo (scripts), Claude 3.5 (blogs), ElevenLabs (voice), DALL-E 3 (thumbnails)
- **Platforms**: YouTube, TikTok, Instagram, Next.js blog
- **Hosting**: Fly.io + Cloudflare R2
- **Security**: JWT Auth, AWS Secrets Manager, RBAC, Rate Limiting
- **Compliance**: GDPR, FTC Disclosure, Cookie Consent

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose
- API Keys: OpenAI, Anthropic (required), others optional

### Docker Setup (Recommended)
```bash
git clone https://github.com/magic-ai-trading-bot/ai-affiliate-empire.git
cd ai-affiliate-empire
cp .env.example .env
# Edit .env with your API keys
docker-compose up -d
```

**Access**:
- Dashboard: http://localhost:3001
- API: http://localhost:3000
- API Docs: http://localhost:3000/api
- Temporal UI: http://localhost:8233

### Testing
```bash
npm test                    # All tests
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e           # E2E tests
npm run test:coverage      # Coverage report (80%+)
npm run test:load:baseline # Load testing
```

## Economics

### Operating Costs: $412/month
- **Fixed**: $177 (Pika Labs, ElevenLabs, Fly.io)
- **Variable**: $235 (OpenAI, Claude, DALL-E)

### Revenue Targets
- Break-even: $412/month
- Phase 1: $2,000/month (485% ROI)
- Phase 2: $10,000/month (2,426% ROI)
- Scale: $100,000+/month (24,271% ROI)

## Project Structure

```
ai-affiliate-empire/
├── src/modules/          # Core business modules
│   ├── analytics/        # Conversion tracking
│   ├── content/          # Script & blog generation
│   ├── optimizer/        # A/B testing & self-optimization
│   ├── orchestrator/     # Temporal workflows
│   ├── product/          # Product discovery & ranking
│   ├── publisher/        # Multi-platform publishing
│   └── video/           # Video generation pipeline
├── docs/                # Documentation
│   ├── project-overview-pdr.md
│   ├── system-architecture.md
│   ├── code-standards.md
│   ├── guides/          # Setup & operational guides
│   └── reports/         # Implementation reports
├── .claude/             # Claude Code configuration
│   ├── workflows/       # Development workflows
│   ├── agents/          # Agent definitions
│   └── commands/        # Slash commands
├── test/               # Test suites
└── prisma/             # Database schema
```

## Documentation

**Essential Reading**:
- [Quick Start](./docs/guides/QUICKSTART.md) - Fast setup guide
- [Setup Guide](./docs/guides/SETUP.md) - Detailed setup instructions
- [System Architecture](./docs/system-architecture.md) - Technical architecture
- [Product Requirements](./docs/project-overview-pdr.md) - Product design & requirements
- [Deployment Guide](./docs/deployment-guide.md) - Production deployment
- [Code Standards](./docs/code-standards.md) - Development standards

**Reports & Status**:
- [Production Readiness](./docs/reports/FINAL-PRODUCTION-READINESS-REPORT.md)
- [Achievement Summary](./docs/reports/10-10-ACHIEVEMENT-SUMMARY.md)
- [Load Test Results](./docs/reports/LOAD-TEST-REPORT.md)

## Security & Compliance

### Security
- JWT authentication with refresh tokens
- Role-Based Access Control (RBAC)
- AWS Secrets Manager integration
- AES-256 encryption for sensitive data
- Rate limiting on all endpoints
- Comprehensive audit logging

### Compliance
- GDPR compliant
- FTC disclosure in all content
- EU cookie consent
- Data retention policies
- Complete audit trail

## Development with Claude Code

This project uses **Claude Code** with specialized AI agents for development.

### Available Agents

- **planner**: Create implementation plans
- **researcher**: Technical research
- **tester**: Run tests and validation
- **code-reviewer**: Code quality analysis
- **debugger**: Investigate issues
- **database-admin**: Database operations
- **docs-manager**: Documentation updates
- **git-manager**: Version control
- **project-manager**: Progress tracking
- **ui-ux-designer**: UI/UX work
- **copywriter**: Marketing copy

### Common Commands

```bash
# Planning & Development
/plan "implement feature"        # Create implementation plan
/cook "implement feature"        # Implement step-by-step
/test                           # Run tests

# Fixing Issues
/fix:fast "bug description"     # Quick fixes
/fix:hard "complex issue"       # Complex fixes with planning
/fix:test "test failures"       # Fix failing tests
/fix:ci "github-actions-url"    # Fix CI/CD issues

# Git Operations
/git:cm                         # Stage & commit
/git:cp                         # Stage, commit & push
/git:pr                         # Create pull request

# Documentation
/docs:update                    # Update documentation
/docs:summarize                 # Generate codebase summary

# Project Status
/watzup                         # Review recent changes
```

See [CLAUDE.md](./CLAUDE.md) for comprehensive agent documentation.

## Release Management

This project uses automated semantic versioning:

- **Automatic Releases**: Every push to `main` triggers a release
- **Semantic Versioning**: MAJOR.MINOR.PATCH
- **Conventional Commits**: Auto-generate changelogs

### Commit Format
```bash
feat: add feature        # Minor version bump
fix: resolve bug         # Patch version bump
feat!: breaking change   # Major version bump
docs: update docs        # Patch version bump
```

## Key Features

### 🤖 Full Autonomy
- Zero human intervention after setup
- 24/7 autonomous operation
- Self-healing with Temporal workflows
- Auto-retry on failures
- Self-optimizing strategies

### 💰 Revenue Optimization
- AI-powered product selection
- Multi-network support (Amazon, ShareASale, CJ)
- Real-time ROI tracking
- A/B testing for optimization
- Performance analytics dashboard

### 🎬 Content Generation
- Automated video pipeline (script → voice → video)
- SEO-optimized blog posts
- Multi-language support
- Brand-consistent thumbnails
- 80%+ test coverage

### 📱 Multi-Platform Publishing
- YouTube Shorts: 6-20 videos/day
- TikTok: 30 videos/day
- Instagram Reels: 25 videos/day
- Blog: Unlimited posts
- Smart scheduling per platform

## Performance Targets

- Content: 50 pieces/day
- Publishing success: >95%
- System uptime: >99.5%
- Avg views/video: 1,000+
- Conversion rate: 2%+
- Revenue/video: $6+

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Follow agent orchestration workflow
4. Ensure tests pass and docs updated
5. Create Pull Request

## License

MIT License - see [LICENSE](LICENSE) file

## Learn More

- [Claude Code Documentation](https://claude.ai/code)
- [Temporal Documentation](https://docs.temporal.io)
- [NestJS Documentation](https://nestjs.com)
- [Prisma Documentation](https://prisma.io)

## Support

- [Issue Tracker](https://github.com/magic-ai-trading-bot/ai-affiliate-empire/issues)
- [Discussions](https://github.com/magic-ai-trading-bot/ai-affiliate-empire/discussions)

---

**Built with Claude Code AI Agent Orchestration** | **Ready for Production** | **$10k+/month Target Revenue**
