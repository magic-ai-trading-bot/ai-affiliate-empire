# Frequently Asked Questions (FAQ) - AI Affiliate Empire

**Last Updated**: 2025-11-01
**Status**: Complete
**Category**: General, Technical, Business, Operations

---

## Table of Contents

- [General Questions](#general-questions)
- [Setup & Installation](#setup--installation)
- [Development](#development)
- [API & Integration](#api--integration)
- [Deployment & Operations](#deployment--operations)
- [Business & Revenue](#business--revenue)
- [Security & Compliance](#security--compliance)
- [Troubleshooting](#troubleshooting)

---

## General Questions

### What is AI Affiliate Empire?

**Answer**: AI Affiliate Empire is a fully autonomous affiliate marketing system that:
- Discovers products from affiliate networks (Amazon, ShareASale, CJ)
- Ranks them by profitability and trends
- Generates AI-powered content (videos, blogs)
- Publishes to YouTube, TikTok, Instagram, and blogs
- Tracks analytics and revenue
- Self-optimizes and scales automatically

No human intervention required after setup.

### What are the key benefits?

**Answer**:
1. **Fully Autonomous**: Runs 24/7 after initial setup
2. **Zero Maintenance**: Self-heals from failures
3. **Self-Optimizing**: A/B tests prompts, kills losers, scales winners
4. **Multi-Platform**: Maximizes reach across 4 platforms
5. **Durable**: Temporal workflows survive crashes
6. **Cost-Effective**: $0.27 per content piece
7. **Scalable**: From $0 to $100k+/month without refactor

### How much does it cost to run?

**Answer**:
- **Fixed**: ~$177/month (hosting, APIs)
- **Variable**: ~$0.27 per content piece
- **Monthly Total**: ~$412/month for 50 pieces/day

Break-even: Week 2-3
Phase 1 Target: $2,000+/month

### Is it production-ready?

**Answer**: Yes! The system has:
- ✅ 80%+ test coverage
- ✅ Production-grade security
- ✅ GDPR compliance
- ✅ FTC disclosure automation
- ✅ Authentication & authorization
- ✅ Docker deployment
- ✅ Monitoring & alerts

See `/docs/PRODUCTION-READINESS-FINAL.md` for details.

### What's the revenue model?

**Answer**: Affiliate commissions from:
- **Primary**: Amazon Associates (2-8% commission)
- **Secondary**: ShareASale (varies by merchant)
- **Tertiary**: CJ Affiliate (varies by program)

Total target: 3-5% average commission across products

---

## Setup & Installation

### How do I get started?

**Answer**: Follow these steps:

1. **Clone repository**:
   ```bash
   git clone <repo-url>
   cd ai-affiliate-empire
   ```

2. **Install dependencies**:
   ```bash
   npm install
   npm run prisma:generate
   ```

3. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with API keys
   ```

4. **Start services**:
   ```bash
   docker-compose up -d
   npm run prisma:migrate:dev
   ```

5. **Start application**:
   ```bash
   npm run start:dev
   ```

Full guide: `/docs/developer-onboarding.md`

### What API keys do I need?

**Answer**:
- **Required**:
  - OpenAI (GPT-4)
  - Anthropic (Claude)

- **Optional** (mock mode available):
  - ElevenLabs (voice)
  - Pika Labs (video)
  - Amazon PA-API
  - YouTube
  - TikTok
  - Instagram

See `/docs/api-integration-guide.md` for setup instructions.

### Can I develop without API keys?

**Answer**: Yes! Use mock mode:
```env
OPENAI_MOCK_MODE=true
ANTHROPIC_MOCK_MODE=true
ELEVENLABS_MOCK_MODE=true
PIKALABS_MOCK_MODE=true
AMAZON_MOCK_MODE=true
YOUTUBE_MOCK_MODE=true
```

You can test the entire system with mock responses.

### What if I'm on Windows?

**Answer**: You have two options:

1. **Use WSL 2** (recommended):
   - Install Windows Subsystem for Linux 2
   - Install Docker for Windows
   - Clone and setup as normal

2. **Use Docker Desktop**:
   - Install Docker Desktop for Windows
   - Everything runs in containers

3. **Manual Setup**:
   - Install Node.js, PostgreSQL, Redis locally
   - Update connection strings

See troubleshooting guide for Windows-specific issues.

### How do I update to the latest version?

**Answer**:
```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Run migrations if needed
npm run prisma:migrate:deploy

# Rebuild if needed
npm run build
```

Changes are released automatically with semantic versioning.

---

## Development

### How do I create a new feature?

**Answer**: Follow this workflow:

1. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement feature**:
   - Write code
   - Write tests (aim for 80%+ coverage)
   - Update documentation

3. **Test locally**:
   ```bash
   npm test
   npm run test:coverage
   ```

4. **Commit with conventional format**:
   ```bash
   git commit -m "feat: add new feature"
   ```

5. **Create pull request**:
   - Push to GitHub
   - Create PR with description
   - Wait for code review

Full guide: `/docs/developer-onboarding.md`

### What's the code quality standard?

**Answer**:
- **TypeScript**: Strict mode, no `any` types
- **Testing**: 80%+ coverage minimum
- **Linting**: ESLint + Prettier
- **Patterns**: Service layer, dependency injection, repository pattern

See `/docs/code-standards.md` for details.

### How do I write tests?

**Answer**:
```typescript
describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProductService]
    }).compile();

    service = module.get(ProductService);
  });

  it('should rank products correctly', async () => {
    const result = await service.rankProducts(products);
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });
});
```

Run: `npm test`, `npm run test:coverage`

Full guide: `/docs/testing-guide.md`

### How do I debug an issue?

**Answer**:
1. Check logs: `docker-compose logs -f`
2. Run specific test: `npm test -- test-file.test.ts`
3. Use debugger: `node --inspect-brk`
4. Check database: `npm run prisma:studio`
5. Verify API: `curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/...`

See `/docs/troubleshooting-guide.md` for common issues.

### What if my code fails tests?

**Answer**:
1. **Read error message** - indicates what failed
2. **Run tests locally**: `npm test`
3. **Fix code** or **update tests** if needed
4. **Run again** to verify
5. **Don't push** unless tests pass

PR cannot be merged if tests fail.

---

## API & Integration

### How do I call the API?

**Answer**: All requests need authentication:

```bash
# 1. Get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ai-affiliate-empire.com",
    "password": "password"
  }'

# 2. Use token in requests
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/products
```

Full API reference: `/docs/api-reference.md`

### What are the rate limits?

**Answer**:
- **General endpoints**: 100 req/min per API key
- **Authentication**: 10 login attempts/min per IP
- **Publishing**: 20 publications/hour
- **Platform limits**: YouTube (6-20/day), TikTok (30/day), Instagram (25/day)

Returns `429 Too Many Requests` when exceeded.

### How do I integrate with external APIs?

**Answer**:
1. Create service in `src/modules/external/`
2. Add API key to `.env`
3. Implement error handling + circuit breaker
4. Write tests with mocks
5. Add documentation to API reference

Example: `/docs/api-integration-guide.md`

### How do I add a new affiliate network?

**Answer**:
1. **Create network service**:
   ```typescript
   export class NewNetworkService {
     async fetchProducts(filters) { }
     async trackConversion(id, revenue) { }
   }
   ```

2. **Add to product module**
3. **Implement ranking logic**
4. **Add tests**
5. **Document in API reference**

Contact team for help with specific networks.

### Can I use the API from external applications?

**Answer**: Yes! The API is fully RESTful and supports:
- Standard HTTP methods (GET, POST, PUT, DELETE)
- JSON request/response
- JWT authentication
- CORS (configurable)
- WebHooks for real-time events

See `/docs/api-reference.md` and `/docs/api-integration-readiness.md`

---

## Deployment & Operations

### How do I deploy to production?

**Answer**: Automatic! Just push to main:

```bash
# Tests run automatically
# If tests pass:
# - Docker image is built
# - Pushed to registry
# - Deployed to production
# - Smoke tests validate
# - Automatic rollback if health check fails
```

Manual deployment:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

Full guide: `/docs/deployment-guide.md`

### Can I schedule the automation?

**Answer**: Yes! The control loop runs daily at a configured time:

```env
# .env
WORKFLOW_SCHEDULE_TIME="02:00"  # 2 AM
WORKFLOW_TIMEZONE="America/New_York"
```

Or manually trigger:
```bash
curl -X POST http://localhost:3000/api/orchestrator/start \
  -H "Authorization: Bearer TOKEN"
```

### How do I monitor the system?

**Answer**:
1. **Dashboard**: http://localhost:3001 (UI)
2. **API Health**: http://localhost:3000/health
3. **Logs**: `docker-compose logs -f`
4. **Temporal UI**: http://localhost:8233 (workflows)
5. **Database**: `npm run prisma:studio`

Set up alerts for critical failures.

### What if something breaks in production?

**Answer**: Emergency procedures:

```bash
# 1. Stop to prevent further damage
docker-compose down

# 2. Check logs
docker-compose logs > incident.log

# 3. Fix database if needed
npm run prisma:migrate:resolve

# 4. Rollback to previous version
git revert <commit-hash>
git push origin main

# 5. Restart
docker-compose up -d
```

Detailed: `/docs/disaster-recovery-runbook.md`

### How do I backup data?

**Answer**:
```bash
# Manual backup
npm run backup:database

# Automated backups (configured in docker-compose)
# Run daily at 3 AM

# Restore from backup
npm run restore:database <backup-file>
```

Location: `/backups/` directory

### Can I monitor performance?

**Answer**: Yes, multiple ways:

1. **Logs**: `docker-compose logs`
2. **Metrics API**: `GET /api/health/metrics`
3. **Temporal UI**: Workflow execution times
4. **Database**: Query performance

See `/docs/performance-slos.md` for SLOs and targets.

---

## Business & Revenue

### How long until I make money?

**Answer**:
- **Week 1-2**: System learns and optimizes
- **Week 2-3**: Break-even ($412/month)
- **Week 4+**: Revenue growth ($1k-$10k+/month)
- **Month 3**: Scale phase ($100k+/month)

Depends on niche quality and platform algorithm changes.

### What niches work best?

**Answer**: Best performing:
- **Tech**: Smartphones, laptops, accessories (high commission)
- **Home**: Smart devices, furniture, tools
- **Health**: Supplements, fitness equipment
- **Gaming**: Consoles, headsets, gaming chairs

Avoid:
- Commodities with low margins
- Heavily saturated niches
- Physical items with low affiliate rates

### How do I optimize revenue?

**Answer**: System automatically does this via:
- **A/B Testing**: Tests different hooks and CTAs
- **Auto-Kill**: Removes underperforming products
- **Auto-Scale**: Increases content for winners
- **Prompt Optimization**: Learns what works

You can also:
- Add niche filters
- Adjust targeting
- Review optimization recommendations

See `/docs/optimization-guide.md`

### Can I scale to multiple accounts?

**Answer**: Yes! The system supports:
- Multiple YouTube channels
- Multiple TikTok accounts
- Multiple Instagram accounts
- Different niches per account

Each account has separate credentials and performance tracking.

See deployment guide for multi-account setup.

### What if revenue drops?

**Answer**: Investigation checklist:

1. **Check system health**: `curl http://localhost:3000/health`
2. **Review analytics**: Dashboard shows trends
3. **Check external APIs**: Are they working?
4. **Check for platform bans**: Review account status
5. **Review optimization logs**: What changed?
6. **Contact team**: If unsure

Common causes:
- Platform algorithm changes
- API rate limits
- Affiliate program changes
- Content quality issues

---

## Security & Compliance

### How are credentials protected?

**Answer**:
- **Encryption**: AES-256 for data at rest
- **AWS Secrets Manager**: Optional for production
- **Environment Variables**: `.env` not in version control
- **API Keys**: Rotated regularly
- **Database**: Credentials never in code

See `/docs/aws-secrets-manager-integration.md`

### Is the system GDPR compliant?

**Answer**: Yes! Includes:
- ✅ Data subject rights (access, delete, export)
- ✅ Consent management
- ✅ Privacy policy
- ✅ Data retention policies
- ✅ Audit logging

See `/docs/COMPLIANCE.md` for full details.

### Does it include FTC disclosures?

**Answer**: Yes! Automatically:
- Adds affiliate disclosures to video scripts
- Includes disclosures in blog posts
- Formats for platform requirements
- Tracks disclosure compliance

See `/docs/ftc-compliance-implementation.md`

### Can I use it in my country?

**Answer**: Check:
1. **Affiliate regulations**: Varies by country
2. **Platform TOS**: YouTube, TikTok, etc.
3. **Data protection**: GDPR, CCPA, etc.
4. **Tax requirements**: Consult accountant

Most countries allow affiliate marketing with proper disclosures.

---

## Troubleshooting

### It won't start. What do I do?

**Answer**: Follow troubleshooting steps:

1. **Check Docker**: `docker-compose ps`
2. **Check logs**: `docker-compose logs`
3. **Check database**: `docker-compose exec postgres pg_isready`
4. **Check .env**: Is DATABASE_URL correct?
5. **Restart**: `docker-compose restart`

Full guide: `/docs/troubleshooting-guide.md`

### API returns 401 Unauthorized

**Answer**: Need authentication token:

```bash
# Get token
curl -X POST http://localhost:3000/auth/login \
  -d '{"email":"admin@ai-affiliate-empire.com","password":"..."}'

# Use in requests
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/products
```

### Database migrations fail

**Answer**:
```bash
# Check status
npm run prisma:migrate:status

# Reset database (WARNING: deletes all data)
npm run prisma:migrate:reset

# Or manually fix and run deploy
npm run prisma:migrate:deploy
```

### Performance is slow

**Answer**: Check:
1. CPU/Memory: `docker stats`
2. Database: `npm run prisma:studio`
3. External APIs: Response times
4. Logs: Any errors?

See `/docs/performance-optimization-recommendations.md`

### I found a security issue

**Answer**: Please report privately:
1. **Don't** create public GitHub issue
2. **Email** security@your-domain.com
3. Include: Issue description, steps to reproduce, impact
4. Give team time to fix before disclosure

---

## Getting Help

### Where's the documentation?

**Answer**:
- **API**: `/docs/api-reference.md`
- **Setup**: `/docs/developer-onboarding.md`
- **Architecture**: `/docs/system-architecture.md`
- **Deployment**: `/docs/deployment-guide.md`
- **Troubleshooting**: `/docs/troubleshooting-guide.md`
- **Code Standards**: `/docs/code-standards.md`

Full documentation index: `/docs/README.md`

### How do I contact the team?

**Answer**:
- **Slack**: #ai-affiliate-empire
- **GitHub Issues**: For bugs/features
- **GitHub Discussions**: For questions
- **Email**: team@your-domain.com
- **Weekly Standup**: Tuesday 10am

### Can I contribute?

**Answer**: Yes! Steps:

1. **Fork repository**
2. **Create feature branch**
3. **Make changes**
4. **Write tests**
5. **Create PR**
6. **Address feedback**
7. **Merge!**

See `/docs/CONTRIBUTING.md` for details.

### Is there a changelog?

**Answer**: Yes!
- **Releases**: GitHub Releases tab
- **Changelog**: `/CHANGELOG.md`
- **Roadmap**: `/docs/project-roadmap.md`

Each commit triggers automatic semantic versioning and changelog generation.

---

## Still Have Questions?

1. **Check documentation**: Start with relevant guide above
2. **Search issues**: Others may have encountered same problem
3. **Ask in Slack**: Team is responsive
4. **Create issue**: For bugs or feature requests
5. **Contact team**: For sensitive topics

---

**Last Updated**: 2025-11-01
**Version**: 1.0.0
**Maintainer**: Development Team

Need help? Refer to the specific documentation sections or contact the team!
